// Mock Angular dependencies
jest.mock('@angular/core', () => ({
  Injectable: () => (target: any) => target
}));

// Mock tabby-core
jest.mock('tabby-core', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    store: {
      ai: {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo'
      }
    }
  }))
}));

// Mock node modules
jest.mock('node-fetch', () => jest.fn());
jest.mock('child_process');
jest.mock('fs');

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

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
const { AIAgentService } = require('../src/services/ai-agent.service');

const mockConfig = {
  store: {
    aiAgent: {
      defaultModel: 'ollama',
      ollamaEndpoint: 'http://localhost:11434',
      geminiApiKey: 'test-key',
      geminiModel: 'gemini-1.5-flash',
      contextWindow: 4000,
      autoResponse: true,
      enableMCPTools: true
    }
  }
};

const mockContextManager = {
  getFullContext: jest.fn().mockResolvedValue({
    workingDirectory: '/test',
    gitStatus: 'Clean working tree',
    recentCommands: ['ls', 'pwd'],
    projectType: 'Node.js/JavaScript'
  }),
  addCommand: jest.fn(),
  addTerminalOutput: jest.fn()
};

const mockMCPClient = {
  getAvailableTools: jest.fn().mockResolvedValue([]),
  isMCPAvailable: jest.fn().mockReturnValue(true),
  executeTool: jest.fn().mockResolvedValue({ result: 'success' })
};

describe('AIAgentService', () => {
  let service: any;

  beforeEach(() => {
    service = new AIAgentService(
      mockConfig,
      mockContextManager,
      mockMCPClient
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processNaturalLanguage', () => {
    it('should process natural language input successfully with Ollama', async () => {
      // Mock health check endpoint (/api/tags)
      const mockHealthResponse = {
        ok: true
      };
      // Mock chat endpoint
      const mockChatResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: { content: 'Test response from Ollama' }
        })
      };
      mockFetch.mockResolvedValueOnce(mockHealthResponse as any);
      mockFetch.mockResolvedValueOnce(mockChatResponse as any);

      const result = await service.processNaturalLanguage('test input');

      expect(result).toBe('Test response from Ollama');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      // Mock health check to succeed (/api/tags)
      global.fetch.mockResolvedValueOnce({ ok: true } as any);
      // Mock chat endpoint to fail
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.processNaturalLanguage('test input');
      expect(result).toContain('I encountered an error');
    });

    it('should handle network errors with fallback', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const result = await service.processNaturalLanguage('test input');

      expect(result).toContain('currently offline');
    });
  });

  describe('observeCommand', () => {
    it('should observe command and add to context', async () => {
      await service.observeCommand('ls -la', 'file1.txt\nfile2.txt');

      expect(mockContextManager.addCommand).toHaveBeenCalledWith('ls -la');
      expect(mockContextManager.addTerminalOutput).toHaveBeenCalledWith('file1.txt\nfile2.txt');
    });
  });

  describe('utility methods', () => {
    it('should clear session history', () => {
      service.clearHistory();
      expect(service.getSessionHistory()).toEqual([]);
    });

    it('should return performance metrics', () => {
      const metrics = service.getPerformanceMetrics();
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
    });

    it('should return configuration values', () => {
      expect(service.getConfiguredModel()).toBe('ollama');
      expect(service.isAutoResponseEnabled()).toBe(true);
      expect(service.isMCPEnabled()).toBe(true);
    });
  });
});