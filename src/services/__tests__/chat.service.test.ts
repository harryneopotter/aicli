// Mock all dependencies BEFORE importing
jest.mock('../session.service', () => ({
  sessionService: {
    getCurrentSession: jest.fn(),
    addMessage: jest.fn(),
    getLastNMessages: jest.fn(),
  },
}));
jest.mock('../context.service', () => ({
  contextService: {
    getContext: jest.fn(),
    buildSystemPrompt: jest.fn(),
    executeCommand: jest.fn(),
  },
}));
jest.mock('../config.service', () => ({
  configService: {
    get: jest.fn(),
    getProviderConfig: jest.fn(),
    setProviderConfig: jest.fn(),
    getSessionDirectory: jest.fn().mockReturnValue('/tmp/test-sessions'),
  },
}));
jest.mock('../agent.service', () => ({
  agentService: {
    getCurrentAgent: jest.fn(),
  },
}));
jest.mock('../tool.service', () => ({
  toolService: {
    getSystemPromptAddition: jest.fn(),
    parseToolCall: jest.fn(),
    getTool: jest.fn(),
  },
}));
jest.mock('../../ui/renderer', () => ({
  uiRenderer: {
    renderMessage: jest.fn(),
    renderLoading: jest.fn(),
    stopLoading: jest.fn(),
    startStreamingResponse: jest.fn(),
    endStreamingResponse: jest.fn(),
    renderStreamingChunk: jest.fn(),
    renderWarning: jest.fn(),
    renderInfo: jest.fn(),
    renderSuccess: jest.fn(),
  },
}));
jest.mock('../../events/ui-events', () => ({
  uiEvents: {
    emit: jest.fn(),
    emitMessage: jest.fn(),
    emitLoading: jest.fn(),
    emitStopLoading: jest.fn(),
    emitStreamingStart: jest.fn(),
    emitStreamingChunk: jest.fn(),
    emitStreamingEnd: jest.fn(),
    emitInfo: jest.fn(),
    emitWarning: jest.fn(),
    emitError: jest.fn(),
    emitSuccess: jest.fn(),
    emitCodeBlock: jest.fn(),
  },
}));
jest.mock('../../providers', () => ({
  providerFactory: {
    getProvider: jest.fn(),
  },
}));

import { ChatService } from '../chat.service';
import { sessionService } from '../session.service';
import { contextService } from '../context.service';
import { configService } from '../config.service';
import { agentService } from '../agent.service';
import { toolService } from '../tool.service';
// import { uiRenderer } from '../../ui/renderer';
import { uiEvents } from '../../events/ui-events';
import { providerFactory } from '../../providers';

describe('ChatService', () => {
  let chatService: ChatService;
  let mockProvider: any;
  let storedMessages: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    chatService = new ChatService();
    storedMessages = [];

    // Setup mock provider
    mockProvider = {
      name: 'mock-provider',
      chat: jest.fn().mockResolvedValue('Mock response'),
      streamChat: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
      initialize: jest.fn().mockResolvedValue(undefined),
    };

    (providerFactory.getProvider as jest.Mock).mockResolvedValue(mockProvider);

    // Setup mock session
    (sessionService.getCurrentSession as jest.Mock).mockReturnValue({
      id: 'test-session',
      messages: [],
      name: 'Test',
      created: new Date(),
      updated: new Date(),
    });

    (sessionService.addMessage as jest.Mock).mockImplementation((role, content) => {
      const msg = {
        id: 'msg-id',
        role,
        content,
        timestamp: new Date(),
      };
      storedMessages.push(msg);
      return msg;
    });

    (sessionService.getLastNMessages as jest.Mock).mockImplementation((n) => {
      return storedMessages.slice(-n);
    });

    // Setup mock context
    (contextService.getContext as jest.Mock).mockResolvedValue({
      cwd: '/test',
      system: { os: 'Linux', platform: 'linux', shell: 'bash' },
      history: { commands: [], outputs: [] },
    });

    (contextService.buildSystemPrompt as jest.Mock).mockReturnValue('System prompt');

    // Setup mock config
    (configService.get as jest.Mock).mockImplementation((key) => {
      if (key === 'context') {
        return { maxHistory: 50, maxContextTokens: 16000 };
      }
      if (key === 'defaultProvider') {
        return 'ollama';
      }
      return {};
    });

    (configService.getProviderConfig as jest.Mock).mockReturnValue({
      model: 'test-model',
    });

    // Setup mock agent
    (agentService.getCurrentAgent as jest.Mock).mockReturnValue(null);

    // Setup mock tools
    (toolService.getSystemPromptAddition as jest.Mock).mockReturnValue('Tools info');
    (toolService.parseToolCall as jest.Mock).mockReturnValue(null);
  });

  describe('switchProvider', () => {
    it('should initialize provider successfully', async () => {
      await chatService.switchProvider('ollama');

      expect(providerFactory.getProvider).toHaveBeenCalled();
      // Note: initialize is called by providerFactory.getProvider internally, not by ChatService
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    it('should throw error if provider is not available', async () => {
      mockProvider.isAvailable.mockResolvedValue(false);

      await expect(chatService.switchProvider('ollama')).rejects.toThrow(
        'Provider ollama is not available'
      );
    });

    it('should set default config if none exists', async () => {
      (configService.getProviderConfig as jest.Mock).mockReturnValueOnce(null);
      (configService.getProviderConfig as jest.Mock).mockReturnValue({
        endpoint: 'http://localhost:11434',
        model: 'openhermes:7b-mistral-v2.5-q4_K_M',
      });

      await chatService.switchProvider('ollama');

      expect(configService.setProviderConfig).toHaveBeenCalledWith(
        'ollama',
        expect.objectContaining({ model: expect.any(String) })
      );
    });
  });

  describe('chat', () => {
    beforeEach(async () => {
      await chatService.switchProvider('ollama');
    });

    it('should send message and receive response', async () => {
      const response = await chatService.chat('Hello', { streaming: false });

      expect(sessionService.addMessage).toHaveBeenCalledWith('user', 'Hello');
      expect(mockProvider.chat).toHaveBeenCalled();
      expect(response).toBe('Mock response');
    });

    it('should throw error if no provider initialized', async () => {
      const newChatService = new ChatService();

      await expect(newChatService.chat('Hello')).rejects.toThrow(
        'No provider initialized'
      );
    });

    it('should throw error if no active session', async () => {
      (sessionService.getCurrentSession as jest.Mock).mockReturnValue(null);

      await expect(chatService.chat('Hello')).rejects.toThrow(
        'No active session'
      );
    });

    it('should handle streaming responses', async () => {
      const chunks = ['Hello', ' ', 'World'];
      mockProvider.streamChat = jest.fn().mockImplementation(async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      });

      const response = await chatService.chat('Test', { streaming: true });

      expect(response).toBe('Hello World');
      // Check for event emissions instead of direct uiRenderer calls
      expect(uiEvents.emitStreamingChunk).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle tool execution', async () => {
      const toolCallResponse = 'Execute this: <tool_code>{"name":"list_files","arguments":{"path":"."}}</tool_code>';
      const toolOutput = 'file1.ts\nfile2.ts';

      mockProvider.chat
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce('Here are the files: file1.ts, file2.ts');

      (toolService.parseToolCall as jest.Mock)
        .mockReturnValueOnce({ name: 'list_files', args: { path: '.' } })
        .mockReturnValueOnce(null);

      const mockTool = {
        execute: jest.fn().mockResolvedValue(toolOutput),
      };

      (toolService.getTool as jest.Mock).mockReturnValue(mockTool);

      await chatService.chat('List files');

      expect(toolService.parseToolCall).toHaveBeenCalled();
      expect(mockTool.execute).toHaveBeenCalledWith({ path: '.' });
      expect(mockProvider.chat).toHaveBeenCalledTimes(2);
    });

    it('should limit tool execution to maxSteps', async () => {
      // Mock infinite tool loop
      mockProvider.chat.mockResolvedValue(
        '<tool_code>{"name":"test","arguments":{}}</tool_code>'
      );
      (toolService.parseToolCall as jest.Mock).mockReturnValue({
        name: 'test',
        args: {}
      });
      (toolService.getTool as jest.Mock).mockReturnValue({
        execute: jest.fn().mockResolvedValue('output'),
      });

      await chatService.chat('Test');

      // Should only execute 5 times (maxSteps)
      expect(mockProvider.chat).toHaveBeenCalledTimes(5);
    });

    it('should handle tool not found', async () => {
      mockProvider.chat
        .mockResolvedValueOnce('<tool_code>{"name":"unknown","arguments":{}}</tool_code>')
        .mockResolvedValueOnce('Tool not found error handled');

      (toolService.parseToolCall as jest.Mock)
        .mockReturnValueOnce({ name: 'unknown', args: {} })
        .mockReturnValueOnce(null);

      (toolService.getTool as jest.Mock).mockReturnValue(undefined);

      await chatService.chat('Test');

      expect(sessionService.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining("Tool 'unknown' not found"),
        expect.any(Object)
      );
    });
  });

  describe('switchProviderWithFallback', () => {
    it('should try fallback providers on failure', async () => {
      mockProvider.isAvailable
        .mockResolvedValueOnce(false) // ollama fails
        .mockResolvedValueOnce(true);  // openai succeeds

      await chatService.switchProviderWithFallback('ollama');

      // Check for event emissions instead of direct uiRenderer calls
      expect(uiEvents.emitWarning).toHaveBeenCalledWith(expect.any(String));
      expect(uiEvents.emitInfo).toHaveBeenCalledWith(expect.stringContaining('Fallback'));
    });

    it('should throw if all providers fail', async () => {
      mockProvider.isAvailable.mockResolvedValue(false);

      await expect(chatService.switchProviderWithFallback('ollama')).rejects.toThrow(
        'All providers failed'
      );
    });
  });

  describe('checkProviderStatus', () => {
    it('should return status when provider is available', async () => {
      await chatService.switchProvider('ollama');

      const status = await chatService.checkProviderStatus();

      expect(status).toEqual({
        provider: 'mock-provider',
        available: true,
      });
    });

    it('should return error when provider is not available', async () => {
      await chatService.switchProvider('ollama');
      mockProvider.isAvailable.mockResolvedValue(false);

      const status = await chatService.checkProviderStatus();

      expect(status.available).toBe(false);
    });

    it('should handle no provider initialized', async () => {
      const newChatService = new ChatService();
      const status = await newChatService.checkProviderStatus();

      expect(status).toEqual({
        provider: 'none',
        available: false,
        error: 'No provider initialized',
      });
    });
  });

  describe('getEmbedding', () => {
    it('should call provider embed method', async () => {
      await chatService.switchProvider('ollama');
      mockProvider.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      const embedding = await chatService.getEmbedding('test text');

      expect(mockProvider.embed).toHaveBeenCalledWith('test text');
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should throw error if provider does not support embeddings', async () => {
      await chatService.switchProvider('ollama');
      mockProvider.embed = undefined;

      await expect(chatService.getEmbedding('test')).rejects.toThrow(
        'does not support embeddings'
      );
    });
  });

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      (contextService.executeCommand as jest.Mock).mockResolvedValue({
        output: 'command output',
        error: null,
      });

      await chatService.executeCommand('ls -la');

      expect(contextService.executeCommand).toHaveBeenCalledWith('ls -la');
      expect(uiEvents.emitCodeBlock).toHaveBeenCalledWith('command output', 'shell');
      expect(sessionService.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('Command: ls -la'),
        expect.objectContaining({
          type: 'command_execution',
          command: 'ls -la',
          output: 'command output',
        })
      );
    });

    it('should handle command execution with warnings', async () => {
      (contextService.executeCommand as jest.Mock).mockResolvedValue({
        output: 'partial output',
        error: 'warning message',
      });

      await chatService.executeCommand('ls -la');

      expect(uiEvents.emitWarning).toHaveBeenCalledWith('Command completed with warnings');
      expect(uiEvents.emitCodeBlock).toHaveBeenCalledWith('partial output', 'shell');
    });

    it('should handle command execution failure', async () => {
      (contextService.executeCommand as jest.Mock).mockRejectedValue(new Error('Execution failed'));

      await chatService.executeCommand('invalid-command');

      expect(uiEvents.emitError).toHaveBeenCalledWith(
        expect.stringContaining('Command execution failed: Execution failed')
      );
    });
  });

  describe('helper methods', () => {
    beforeEach(async () => {
      await chatService.switchProvider('ollama');
    });

    it('should explain command', async () => {
      await chatService.explainCommand('ls -la');
      expect(mockProvider.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Explain this command'),
          }),
        ])
      );
    });

    it('should suggest command', async () => {
      await chatService.suggestCommand('list files');
      expect(mockProvider.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Suggest a command'),
          }),
        ])
      );
    });

    it('should debug error', async () => {
      await chatService.debugError('Error: failed');
      // The chat method adds system messages and history, so we need to check if our prompt is in the messages array
      expect(mockProvider.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Help me debug this error'),
          }),
        ])
      );
    });
  });

  describe('getCurrentProvider', () => {
    it('should return current provider name', async () => {
      await chatService.switchProvider('ollama');
      expect(chatService.getCurrentProvider()).toBe('mock-provider');
    });

    it('should return "none" if no provider initialized', () => {
      const newChatService = new ChatService();
      expect(newChatService.getCurrentProvider()).toBe('none');
    });
  });

  describe('initialize', () => {
    it('should initialize with default provider', async () => {
      await chatService.initialize();
      expect(providerFactory.getProvider).toHaveBeenCalled();
    });
  });
});