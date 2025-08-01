// Mock Angular dependencies
jest.mock('@angular/core', () => ({
  Injectable: () => (target: any) => target
}));

// Mock node modules
jest.mock('child_process');
jest.mock('@modelcontextprotocol/sdk/client/stdio.js');
jest.mock('@modelcontextprotocol/sdk/client/index.js');

// Mock console methods
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Import after mocking
const { MCPClientService } = require('../src/services/mcp-client.service');

const mockSpawn = jest.fn();
const mockClient = {
  connect: jest.fn(),
  listTools: jest.fn(),
  callTool: jest.fn(),
  close: jest.fn(),
  ping: jest.fn()
};
const mockStdioClientTransport = jest.fn();

// Setup mocks
require('child_process').spawn = mockSpawn;
require('@modelcontextprotocol/sdk/client/index.js').Client = jest.fn(() => mockClient);
require('@modelcontextprotocol/sdk/client/stdio.js').StdioClientTransport = mockStdioClientTransport;

const mockTools = [
  {
    name: 'filesystem_read',
    description: 'Read file contents',
    inputSchema: { type: 'object' as const, properties: {} }
  },
  {
    name: 'git_status',
    description: 'Get git status',
    inputSchema: { type: 'object' as const, properties: {} }
  }
];

const mockToolsWithServerName = [
  {
    name: 'filesystem_read',
    description: 'Read file contents',
    inputSchema: { type: 'object' as const, properties: {} },
    serverName: 'filesystem'
  },
  {
    name: 'git_status',
    description: 'Get git status',
    inputSchema: { type: 'object' as const, properties: {} },
    serverName: 'filesystem'
  }
];

describe('MCPClientService', () => {
  let service: any;
  let mockProcess: any;

  beforeEach(() => {
    service = new MCPClientService();
    mockProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    mockSpawn.mockReturnValue(mockProcess);
    jest.clearAllMocks();
  });

  describe('initializeServers', () => {
    it('should initialize MCP servers successfully', async () => {
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.listTools.mockResolvedValue({ tools: mockTools });

      await service.initializeServers();

      expect(mockSpawn).toHaveBeenCalledTimes(2); // filesystem, git (brave-search and sqlite disabled by default)
      expect(mockClient.connect).toHaveBeenCalledTimes(2);
    });

    it('should handle server initialization failures', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      await service.initializeServers();

      // Should not throw, but mark servers as unhealthy
      const health = service.getServerHealth();
      expect(health.filesystem).toBe(false);
    });
  });

  describe('getAvailableTools', () => {
    it('should return tools from healthy servers', async () => {
      // Setup healthy servers
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];
      
      mockClient.listTools.mockResolvedValue({ tools: mockTools });

      const tools = await service.getAvailableTools();

      expect(tools).toEqual(mockToolsWithServerName);
      expect(mockClient.listTools).toHaveBeenCalled();
    });

    it('should skip unhealthy servers', async () => {
      // Setup unhealthy server
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: false,
        lastHealthCheck: Date.now()
      }];

      const tools = await service.getAvailableTools();

      expect(tools).toEqual([]);
      expect(mockClient.listTools).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];
      
      mockClient.listTools.mockRejectedValue(new Error('List tools failed'));

      const tools = await service.getAvailableTools();

      expect(tools).toEqual([]);
    });
  });

  describe('executeTool', () => {
    it('should execute tool successfully', async () => {
      const mockResult = { result: 'File contents here' };
      
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];
      
      mockClient.listTools.mockResolvedValue({ tools: mockTools });
      mockClient.callTool.mockResolvedValue(mockResult);

      const result = await service.executeTool('filesystem_read', { path: '/test/file.txt' });

      expect(result).toEqual(mockResult);
      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'filesystem_read',
        arguments: { path: '/test/file.txt' }
      });
    });

    it('should throw error when tool not found', async () => {
      service.mcpServers = [];
      
      await expect(service.executeTool('unknown_tool', {}))
        .rejects.toThrow('not found or no healthy servers available');
    });

    it('should retry on failure', async () => {
      service.mcpServers = [
        {
          name: 'filesystem1',
          command: 'npx',
          args: ['@modelcontextprotocol/server-filesystem'],
          description: 'File system operations',
          enabled: true,
          priority: 1,
          timeout: 10000,
          retryCount: 3,
          client: mockClient,
          process: mockProcess,
          isHealthy: true,
          lastHealthCheck: Date.now()
        },
        {
          name: 'filesystem2',
          command: 'npx',
          args: ['@modelcontextprotocol/server-filesystem'],
          description: 'File system operations',
          enabled: true,
          priority: 2,
          timeout: 10000,
          retryCount: 3,
          client: mockClient,
          process: mockProcess,
          isHealthy: true,
          lastHealthCheck: Date.now()
        }
      ];
      
      mockClient.listTools.mockResolvedValue({ tools: mockTools });
      mockClient.callTool
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ result: 'Success on retry' });

      const result = await service.executeTool('filesystem_read', { path: '/test/file.txt' });

      expect(result).toEqual({ result: 'Success on retry' });
    });
  });

  describe('health monitoring', () => {
    it('should perform health checks', async () => {
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];
      
      mockClient.ping.mockResolvedValue(undefined);

      // Call the private method directly for testing
      await service.performHealthChecks();

      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('should mark server unhealthy on ping failure', async () => {
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];
      
      mockClient.ping.mockRejectedValue(new Error('Ping failed'));

      await service.performHealthChecks();

      expect(service.mcpServers[0].isHealthy).toBe(false);
    });
  });

  describe('server management', () => {
    it('should return server health status', () => {
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];

      const health = service.getServerHealth();
      expect(health.filesystem).toBe(true);
    });

    it('should check MCP availability', () => {
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];

      expect(service.isMCPAvailable()).toBe(true);
    });

    it('should restart specific server', async () => {
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: false,
        lastHealthCheck: Date.now()
      }];
      
      mockClient.connect.mockResolvedValue(undefined);

      await service.restartServer('filesystem');

      expect(mockProcess.kill).toHaveBeenCalled();
      expect(mockSpawn).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown all servers gracefully', async () => {
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];
      
      mockClient.close.mockResolvedValue(undefined);

      await service.shutdown();

      expect(mockClient.close).toHaveBeenCalled();
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      service.mcpServers = [{
        name: 'filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        description: 'File system operations',
        enabled: true,
        priority: 1,
        timeout: 10000,
        retryCount: 3,
        client: mockClient,
        process: mockProcess,
        isHealthy: true,
        lastHealthCheck: Date.now()
      }];
      
      mockClient.close.mockRejectedValue(new Error('Close failed'));

      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });
});