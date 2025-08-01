// plugin.ts - Main Tabby Plugin Entry Point
import { NgModule, Injectable } from '@angular/core'
import { PluginAPI, ConfigProvider, HotkeysService, HostAppService } from 'tabby-core'
import { TerminalDecorator } from 'tabby-terminal'
import { AIAgentService } from './services/ai-agent.service'
import { MCPClientService } from './services/mcp-client.service'
import { ContextManagerService } from './services/context-manager.service'
import { AITerminalComponent } from './components/ai-terminal.component'

@Injectable()
export class AIAgentTerminalDecorator extends TerminalDecorator {
  constructor(
    private aiAgent: AIAgentService,
    private contextManager: ContextManagerService,
    private mcpClient: MCPClientService
  ) {
    super()
  }

  attach(terminal: any): void {
    // Override terminal input/output to intercept all commands
    const originalWrite = terminal.write.bind(terminal)
    const originalInput = terminal.onData.bind(terminal)

    // Intercept all terminal output
    terminal.write = (data: string) => {
      this.contextManager.addTerminalOutput(data)
      return originalWrite(data)
    }

    // Intercept all user input
    terminal.onData((data: string) => {
      this.handleUserInput(data, terminal)
    })
  }

  private async handleUserInput(input: string, terminal: any) {
    const cleanInput = input.trim()
    
    // Always add to context
    this.contextManager.addUserInput(cleanInput)
    
    // Determine if it's a command or natural language
    if (this.isCommand(cleanInput)) {
      // Execute command normally, but AI observes
      terminal.input(input)
      await this.aiAgent.observeCommand(cleanInput)
    } else if (cleanInput.length > 0) {
      // Natural language - AI responds directly
      await this.handleAIConversation(cleanInput, terminal)
    } else {
      // Empty input, just pass through
      terminal.input(input)
    }
  }

  private isCommand(input: string): boolean {
    // Liberal detection - anything that looks like a command
    const commandPatterns = [
      /^[a-zA-Z][a-zA-Z0-9_-]*(\s|$)/, // Standard commands (ls, cd, git, etc.)
      /^\.\//, // Relative execution
      /^\//, // Absolute paths
      /^\w+:/, // Windows drives
      /^~/, // Home directory
      /^\$/, // Variable expansion
      /^\|/, // Pipes
      /^>/, // Redirects
    ]
    
    return commandPatterns.some(pattern => pattern.test(input))
  }

  private async handleAIConversation(input: string, terminal: any) {
    // Show user input in chat interface
    this.displayChatMessage('user', input, terminal)
    
    // Get context for AI
    const context = await this.contextManager.getFullContext()
    
    // Get available MCP tools
    const availableTools = await this.mcpClient.getAvailableTools()
    
    // Send to AI with context and tools
    const response = await this.aiAgent.processNaturalLanguage(
      input, 
      context, 
      availableTools
    )
    
    // Display AI response in blocks
    this.displayChatMessage('assistant', response, terminal)
  }

  private displayChatMessage(role: 'user' | 'assistant', content: string, terminal: any) {
    const timestamp = new Date().toLocaleTimeString()
    const roleColor = role === 'user' ? '\x1b[36m' : '\x1b[32m' // Cyan for user, Green for AI
    const resetColor = '\x1b[0m'
    
    terminal.write(`\r\n${roleColor}[${role.toUpperCase()} ${timestamp}]${resetColor}\r\n`)
    terminal.write(`${content}\r\n`)
    terminal.write('\r\n─────────────────────────────────────────\r\n')
  }
}