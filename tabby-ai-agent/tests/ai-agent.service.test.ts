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
jest.mock('simple-git', () => ({
  simpleGit: jest.fn(() => ({
    status: jest.fn().mockResolvedValue({ files: [] }),
  })),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

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
    (fetch as jest.Mock).mockClear();
  });

  describe('processNaturalLanguage', () => {
    it('should process natural language input successfully with Ollama', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({ ok: true });
        }
        if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: { content: 'Test response from Ollama' } }),
          });
        }
        return Promise.reject(new Error('Unhandled fetch call'));
      });
      service = new AIAgentService(mockConfig, mockContextManager, mockMCPClient);
      const result = await service.processNaturalLanguage('test input');

      expect(result).toBe('Test response from Ollama');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({ ok: true });
        }
        if (url.includes('/api/chat')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('Unhandled fetch call'));
      });
      service = new AIAgentService(mockConfig, mockContextManager, mockMCPClient);
      const result = await service.processNaturalLanguage('test input');
      expect(result).toContain('I encountered an error');
    });

    it('should handle network errors with fallback', async () => {
      (fetch as jest.Mock).mockImplementation(() => Promise.reject(new Error('Network error')));
      service = new AIAgentService(mockConfig, mockContextManager, mockMCPClient);
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