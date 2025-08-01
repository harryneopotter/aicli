import { Injectable } from '@angular/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { spawn, ChildProcess } from 'child_process'

interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  description: string
  enabled: boolean
  priority: number
  timeout: number
  retryCount: number
  env?: Record<string, string>
}

interface MCPServer extends MCPServerConfig {
  client?: Client
  process?: ChildProcess
  isHealthy: boolean
  lastHealthCheck: number
  connectionAttempts: number
  lastError?: string
}

interface MCPTool {
  name: string
  description: string
  inputSchema: any
  serverName: string
}

interface MCPServerStats {
  name: string
  isHealthy: boolean
  uptime: number
  toolsCount: number
  lastHealthCheck: number
  connectionAttempts: number
  lastError?: string
}

@Injectable()
export class MCPClientService {
  private mcpServers: MCPServer[] = []
  private defaultServerConfigs: MCPServerConfig[] = [
    {
      name: 'filesystem',
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', process.cwd()],
      description: 'Read/write files efficiently - reduces token usage by reading only relevant files',
      enabled: true,
      priority: 1,
      timeout: 10000,
      retryCount: 3
    },
    {
      name: 'git',
      command: 'npx', 
      args: ['@modelcontextprotocol/server-git'],
      description: 'Git operations - get context without long git log outputs',
      enabled: true,
      priority: 2,
      timeout: 8000,
      retryCount: 3
    },
    {
      name: 'brave-search',
      command: 'npx',
      args: ['@modelcontextprotocol/server-brave-search'],
      description: 'Web search for documentation - reduces need for large context about libraries',
      enabled: false, // Disabled by default as it requires API key
      priority: 3,
      timeout: 15000,
      retryCount: 2,
      env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY || '' }
    },
    {
      name: 'sqlite',
      command: 'npx',
      args: ['@modelcontextprotocol/server-sqlite'],
      description: 'Database queries - get structured data without dumping entire tables',
      enabled: false, // Disabled by default
      priority: 4,
      timeout: 12000,
      retryCount: 3
    },
    {
      name: 'postgres',
      command: 'npx',
      args: ['@modelcontextprotocol/server-postgres'],
      description: 'PostgreSQL database operations',
      enabled: false,
      priority: 5,
      timeout: 12000,
      retryCount: 3,
      env: { DATABASE_URL: process.env.DATABASE_URL || '' }
    }
  ]

  private healthCheckInterval = 30000 // 30 seconds
  private maxRetries = 3
  private isInitialized = false
  private serverStartTime = new Map<string, number>()

  constructor() {
    this.initializeFromConfig()
  }

  /**
   * Initialize from configuration
   */
  private initializeFromConfig(): void {
    // Load custom server configurations if available
    const customConfigs = this.loadCustomServerConfigs()
    const configs = customConfigs.length > 0 ? customConfigs : this.defaultServerConfigs
    
    this.mcpServers = configs.map(config => ({
      ...config,
      isHealthy: false,
      lastHealthCheck: 0,
      connectionAttempts: 0
    }))
    
    // Sort by priority
    this.mcpServers.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Load custom server configurations (placeholder for future config file support)
   */
  private loadCustomServerConfigs(): MCPServerConfig[] {
    // TODO: Load from config file or environment variables
    // For now, return empty array to use defaults
    return []
  }

  /**
   * Add a new MCP server configuration
   */
  addServerConfig(config: MCPServerConfig): void {
    const existingIndex = this.mcpServers.findIndex(s => s.name === config.name)
    
    if (existingIndex >= 0) {
      // Update existing server
      const existingServer = this.mcpServers[existingIndex]
      this.mcpServers[existingIndex] = {
        ...existingServer,
        ...config,
        isHealthy: false,
        lastHealthCheck: 0,
        connectionAttempts: 0
      }
    } else {
      // Add new server
      this.mcpServers.push({
        ...config,
        isHealthy: false,
        lastHealthCheck: 0,
        connectionAttempts: 0
      })
    }
    
    // Re-sort by priority
    this.mcpServers.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Remove a server configuration
   */
  async removeServerConfig(serverName: string): Promise<void> {
    const serverIndex = this.mcpServers.findIndex(s => s.name === serverName)
    
    if (serverIndex >= 0) {
      const server = this.mcpServers[serverIndex]
      
      // Disconnect if connected
      if (server.client || server.process) {
        await this.disconnectServer(server)
      }
      
      // Remove from array
      this.mcpServers.splice(serverIndex, 1)
    }
  }

  /**
   * Initialize MCP servers with proper SDK integration
   */
  async initializeServers(): Promise<void> {
    if (this.isInitialized) {
      console.log('MCP servers already initialized')
      return
    }
    
    console.log('Initializing MCP servers...')
    
    // Only initialize enabled servers
    const enabledServers = this.mcpServers.filter(s => s.enabled)
    
    for (const server of enabledServers) {
      try {
        await this.connectToServer(server)
      } catch (error) {
        console.error(`Failed to initialize server ${server.name}:`, error)
        server.isHealthy = false
        server.lastError = error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    this.isInitialized = true
    this.startHealthMonitoring()
  }

  /**
   * Connect to a specific MCP server using the official SDK
   */
  private async connectToServer(server: MCPServer): Promise<void> {
    server.connectionAttempts++
    
    try {
      // Check if server is already connected
      if (server.client && server.isHealthy) {
        console.log(`Server ${server.name} is already connected`)
        return
      }
      
      // Prepare environment variables
      const env = {
        ...process.env,
        ...(server.env || {})
      }
      
      // Spawn the MCP server process with timeout
      const childProcess = spawn(server.command, server.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env
      })
      
      // Set up process timeout
      const timeoutId = setTimeout(() => {
        childProcess.kill('SIGTERM')
        throw new Error(`Server ${server.name} connection timeout after ${server.timeout || 10000}ms`)
      }, server.timeout || 10000)

      // Create transport using the official SDK
      const transport = new StdioClientTransport({
        stdin: childProcess.stdin!,
        stdout: childProcess.stdout!
      } as any)

      // Create MCP client
      const client = new Client({
        name: `tabby-ai-agent-${server.name}`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      })

      // Connect to the server
      await client.connect(transport)
      
      // Clear timeout on successful connection
      clearTimeout(timeoutId)

      // Store references
      server.client = client
      server.process = childProcess
      server.isHealthy = true
      server.lastHealthCheck = Date.now()
      server.lastError = undefined
      this.serverStartTime.set(server.name, Date.now())

      console.log(`Successfully connected to MCP server: ${server.name} (attempt ${server.connectionAttempts})`)

      // Handle process errors
      childProcess.on('error', (error: any) => {
        console.error(`MCP server ${server.name} process error:`, error)
        server.isHealthy = false
        server.lastError = error.message
        this.serverStartTime.delete(server.name)
      })

      childProcess.on('exit', (code: number | null) => {
        console.warn(`MCP server ${server.name} exited with code ${code}`)
        server.isHealthy = false
        server.client = undefined
        server.process = undefined
        server.lastError = `Process exited with code ${code}`
        this.serverStartTime.delete(server.name)
      })
      
      // Handle stderr for debugging
      childProcess.stderr?.on('data', (data) => {
        console.warn(`MCP server ${server.name} stderr:`, data.toString())
      })

    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.name}:`, error)
      server.isHealthy = false
      server.lastError = error instanceof Error ? error.message : 'Unknown error'
      throw error
    }
  }
  
  /**
   * Disconnect from a specific MCP server
   */
  private async disconnectServer(server: MCPServer): Promise<void> {
    console.log(`Disconnecting from MCP server: ${server.name}`)
    
    if (server.client) {
      try {
        await server.client.close()
      } catch (error) {
        console.warn(`Error closing client for ${server.name}:`, error)
      }
      server.client = undefined
    }

    if (server.process) {
      server.process.kill('SIGTERM')
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (server.process && !server.process.killed) {
          server.process.kill('SIGKILL')
        }
      }, 5000)
      
      server.process = undefined
    }
    
    server.isHealthy = false
    this.serverStartTime.delete(server.name)
  }

  /**
   * Get available tools from all healthy MCP servers
   */
  async getAvailableTools(): Promise<MCPTool[]> {
    const tools: MCPTool[] = []
    
    for (const server of this.mcpServers) {
      if (server.client && server.isHealthy && server.enabled) {
        try {
          const result = await server.client.listTools()
          if (result.tools) {
            const serverTools = result.tools.map((tool: any) => ({
              ...tool,
              serverName: server.name
            }))
            tools.push(...serverTools)
          }
        } catch (error) {
          console.warn(`Failed to get tools from ${server.name}:`, error)
          server.lastError = error instanceof Error ? error.message : 'Failed to list tools'
        }
      }
    }
    
    return tools
  }

  /**
   * Get tools from a specific server
   */
  async getServerTools(serverName: string): Promise<MCPTool[]> {
    const server = this.mcpServers.find(s => s.name === serverName)
    
    if (!server || !server.client || !server.isHealthy) {
      return []
    }
    
    try {
      const result = await server.client.listTools()
      if (result.tools) {
        return result.tools.map((tool: any) => ({
          ...tool,
          serverName: server.name
        }))
      }
    } catch (error) {
      console.warn(`Failed to get tools from ${server.name}:`, error)
      server.lastError = error instanceof Error ? error.message : 'Failed to list tools'
    }
    
    return []
  }

  /**
   * Execute a tool call via MCP
   */
  async executeTool(toolName: string, parameters: any, preferredServer?: string): Promise<any> {
    // Sort servers by priority, but prefer the specified server if provided
    const sortedServers = [...this.mcpServers].sort((a, b) => {
      if (preferredServer) {
        if (a.name === preferredServer) return -1
        if (b.name === preferredServer) return 1
      }
      return a.priority - b.priority
    })
    
    for (const server of sortedServers) {
      if (server.client && server.isHealthy && server.enabled) {
        try {
          const tools = await server.client.listTools()
          const tool = tools.tools?.find((t: any) => t.name === toolName)
          
          if (tool) {
            console.log(`Executing tool '${toolName}' on server '${server.name}'`)
            const result = await server.client.callTool({
              name: toolName,
              arguments: parameters
            })
            return result
          }
        } catch (error) {
          console.warn(`Tool execution failed on ${server.name}:`, error)
          server.lastError = error instanceof Error ? error.message : 'Tool execution failed'
          continue
        }
      }
    }
    
    throw new Error(`Tool '${toolName}' not found or no healthy servers available`)
  }

  /**
   * Execute a tool on a specific server
   */
  async executeToolOnServer(serverName: string, toolName: string, parameters: any): Promise<any> {
    const server = this.mcpServers.find(s => s.name === serverName)
    
    if (!server) {
      throw new Error(`Server '${serverName}' not found`)
    }
    
    if (!server.client || !server.isHealthy) {
      throw new Error(`Server '${serverName}' is not healthy or connected`)
    }
    
    if (!server.enabled) {
      throw new Error(`Server '${serverName}' is disabled`)
    }
    
    try {
      const tools = await server.client.listTools()
      const tool = tools.tools?.find((t: any) => t.name === toolName)
      
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found on server '${serverName}'`)
      }
      
      console.log(`Executing tool '${toolName}' on server '${serverName}'`)
      const result = await server.client.callTool({
        name: toolName,
        arguments: parameters
      })
      return result
    } catch (error) {
      server.lastError = error instanceof Error ? error.message : 'Tool execution failed'
      throw error
    }
  }

  /**
   * Health monitoring for MCP servers
   */
  private startHealthMonitoring(): void {
    if (!this.isInitialized) {
      return
    }
    
    setInterval(async () => {
      await this.performHealthChecks()
    }, this.healthCheckInterval)
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    for (const server of this.mcpServers) {
      if (!server.client || !server.process) {
        server.isHealthy = false
        continue
      }

      try {
        // Simple ping to check if server is responsive
        await server.client.ping()
        server.isHealthy = true
        server.lastHealthCheck = Date.now()
      } catch (error) {
        console.warn(`Health check failed for ${server.name}:`, error)
        server.isHealthy = false
        
        // Attempt to restart the server
        await this.restartServerByObject(server)
      }
    }
  }

  /**
   * Restart a failed MCP server
   */
  private async restartServerByObject(server: MCPServer): Promise<void> {
    console.log(`Attempting to restart MCP server: ${server.name}`)
    
    // Clean up existing connections
    if (server.client) {
      try {
        await server.client.close()
      } catch (error) {
        console.warn(`Error closing client for ${server.name}:`, error)
      }
      server.client = undefined
    }

    if (server.process) {
      server.process.kill()
      server.process = undefined
    }

    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Attempt to reconnect
    try {
      await this.connectToServer(server)
      console.log(`Successfully restarted MCP server: ${server.name}`)
    } catch (error) {
      console.error(`Failed to restart MCP server ${server.name}:`, error)
    }
  }

  /**
   * Get server health status
   */
  getServerHealth(): { [serverName: string]: boolean } {
    const health: { [serverName: string]: boolean } = {}
    
    for (const server of this.mcpServers) {
      health[server.name] = server.isHealthy
    }
    
    return health
  }

  /**
   * Get detailed server statistics
   */
  async getServerStats(): Promise<MCPServerStats[]> {
    const stats: MCPServerStats[] = []
    
    for (const server of this.mcpServers) {
      const startTime = this.serverStartTime.get(server.name)
      const uptime = startTime ? Date.now() - startTime : 0
      
      let toolsCount = 0
      if (server.client && server.isHealthy) {
        try {
          const tools = await server.client.listTools()
          toolsCount = tools.tools?.length || 0
        } catch (error) {
          // Ignore errors for stats
        }
      }
      
      stats.push({
        name: server.name,
        isHealthy: server.isHealthy,
        uptime,
        toolsCount,
        lastHealthCheck: server.lastHealthCheck,
        connectionAttempts: server.connectionAttempts,
        lastError: server.lastError
      })
    }
    
    return stats
  }

  /**
   * Enable or disable a server
   */
  async setServerEnabled(serverName: string, enabled: boolean): Promise<void> {
    const server = this.mcpServers.find(s => s.name === serverName)
    
    if (!server) {
      throw new Error(`Server '${serverName}' not found`)
    }
    
    if (server.enabled === enabled) {
      return // No change needed
    }
    
    server.enabled = enabled
    
    if (enabled) {
      // Try to connect if enabling
      try {
        await this.connectToServer(server)
      } catch (error) {
        console.error(`Failed to enable server ${serverName}:`, error)
        throw error
      }
    } else {
      // Disconnect if disabling
      await this.disconnectServer(server)
    }
  }

  /**
   * Get list of all configured servers
   */
  getServerConfigs(): MCPServerConfig[] {
    return this.mcpServers.map(server => ({
      name: server.name,
      command: server.command,
      args: server.args,
      description: server.description,
      enabled: server.enabled,
      priority: server.priority,
      timeout: server.timeout,
      retryCount: server.retryCount,
      env: server.env
    }))
  }

  async getHealthStatus(): Promise<Record<string, { healthy: boolean; lastCheck: number; error?: string }>> {
    const status: Record<string, { healthy: boolean; lastCheck: number; error?: string }> = {}
    
    for (const server of this.mcpServers) {
      status[server.name] = {
        healthy: server.isHealthy,
        lastCheck: server.lastHealthCheck,
        error: server.isHealthy ? undefined : 'Server unhealthy'
      }
    }
    
    return status
  }

  /**
   * Gracefully shutdown all MCP servers
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down MCP servers...')
    
    for (const server of this.mcpServers) {
      if (server.client) {
        try {
          await server.client.close()
        } catch (error) {
          console.warn(`Error closing client for ${server.name}:`, error)
        }
      }
      
      if (server.process) {
        server.process.kill()
      }
    }
  }

  /**
   * Check if MCP is available (at least one server is healthy)
   */
  isMCPAvailable(): boolean {
    return this.mcpServers.some(server => server.isHealthy)
  }

  /**
   * Initialize the MCP client service
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeServers()
      console.log('MCP Client initialized successfully')
    } catch (error) {
      console.error('Failed to initialize MCP client:', error)
      throw error
    }
  }

  /**
   * Restart a specific server by name
   */
  async restartServer(serverName: string): Promise<void> {
    const server = this.mcpServers.find(s => s.name === serverName)
    if (!server) {
      throw new Error(`Server '${serverName}' not found`)
    }
    
    await this.restartServerByObject(server)
  }

  private validateServerConfig(config: MCPServerConfig) {
    // Add allowed commands pattern
    const ALLOWED_COMMANDS = new Set(['npx', 'node']);
    if (!ALLOWED_COMMANDS.has(config.command)) {
      throw new Error(`Disallowed command: ${config.command}`);
    }
  }
}
