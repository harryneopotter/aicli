jest.mock('../../services/session.service', () => {
  const defaultSession = {
    id: 'session-1',
    name: 'Test Session',
    created: new Date('2024-01-01T00:00:00Z'),
    updated: new Date('2024-01-01T00:00:00Z'),
    messages: [],
  };

  return {
    sessionService: {
      initialize: jest.fn(),
      cleanup: jest.fn(),
      getCurrentSession: jest.fn(() => defaultSession),
      createSession: jest.fn().mockResolvedValue(defaultSession),
      saveCurrentSession: jest.fn().mockResolvedValue(undefined),
      loadSession: jest.fn().mockResolvedValue(defaultSession),
      listSessions: jest.fn().mockResolvedValue([]),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      clearMessages: jest.fn(),
      searchSessions: jest.fn().mockResolvedValue([]),
      exportSession: jest.fn().mockResolvedValue('{}'),
      getSessionStats: jest.fn().mockResolvedValue({
        totalSessions: 0,
        totalMessages: 0,
        oldestSession: undefined,
        newestSession: undefined,
      }),
    },
  };
});

import { CommandHandler } from '../handlers';
import { uiRenderer } from '../../ui/renderer';
import { sessionService } from '../../services/session.service';
import { chatService } from '../../services/chat.service';
import { configService } from '../../services/config.service';
import { contextService } from '../../services/context.service';
import { analysisService } from '../../services/analysis.service';
import { agentService } from '../../services/agent.service';
import { ragService } from '../../services/rag.service';
import { mcpService } from '../../services/mcp.service';
import { toolService } from '../../services/tool.service';
import { docsService } from '../../services/docs.service';

jest.mock('../../ui/renderer');
jest.mock('../../services/session.service');
jest.mock('../../services/chat.service');
jest.mock('../../services/config.service');
jest.mock('../../services/context.service');
jest.mock('../../services/analysis.service');
jest.mock('../../services/agent.service');
jest.mock('../../services/rag.service');
jest.mock('../../services/mcp.service');
jest.mock('../../services/tool.service');
jest.mock('../../services/docs.service');

const mockedAnalysisService = analysisService as jest.Mocked<typeof analysisService>;
const mockedAgentService = agentService as jest.Mocked<typeof agentService>;
const mockedToolService = toolService as jest.Mocked<typeof toolService>;
const mockedDocsService = docsService as jest.Mocked<typeof docsService>;
const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

describe('CommandHandler', () => {
  let handler: CommandHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new CommandHandler();
  });

  afterAll(() => {
    exitSpy.mockRestore();
  });

  describe('handleCommand', () => {
    it('should return false for non-commands', async () => {
      const result = await handler.handleCommand('hello world');
      expect(result).toBe(false);
    });

    it('should handle /help', async () => {
      await handler.handleCommand('/help');
      expect(uiRenderer.renderHelp).toHaveBeenCalled();
    });

    it('should handle /clear', async () => {
      await handler.handleCommand('/clear');
      expect(uiRenderer.clear).toHaveBeenCalled();
      expect(uiRenderer.renderWelcome).toHaveBeenCalled();
    });

    it('should handle /exit', async () => {
      const result = await handler.handleCommand('/exit');
      expect(result).toBe(true);
    });

    it('should handle /quit', async () => {
      const result = await handler.handleCommand('/quit');
      expect(result).toBe(true);
    });

    it('should handle /new', async () => {
      await handler.handleCommand('/new test-session');
      expect(sessionService.createSession).toHaveBeenCalledWith('test-session');
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /save', async () => {
      await handler.handleCommand('/save');
      expect(sessionService.saveCurrentSession).toHaveBeenCalled();
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /load', async () => {
      await handler.handleCommand('/load session-id');
      expect(sessionService.loadSession).toHaveBeenCalledWith('session-id');
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /list', async () => {
      (sessionService.listSessions as jest.Mock).mockResolvedValueOnce([
        { id: '1', name: 'test', updated: new Date(), messages: [] }
      ]);
      await handler.handleCommand('/list');
      expect(sessionService.listSessions).toHaveBeenCalled();
      expect(uiRenderer.renderTable).toHaveBeenCalled();
    });

    it('should handle /delete', async () => {
      await handler.handleCommand('/delete session-id');
      expect(sessionService.deleteSession).toHaveBeenCalledWith('session-id');
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /config', async () => {
      (configService.get as jest.Mock).mockReturnValue({
        defaultProvider: 'ollama',
        providers: {}
      });
      await handler.handleCommand('/config');
      expect(uiRenderer.renderBox).toHaveBeenCalled();
    });

    it('should handle /provider', async () => {
      await handler.handleCommand('/provider openai');
      expect(chatService.switchProvider).toHaveBeenCalledWith('openai');
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /model', async () => {
      (configService.get as jest.Mock).mockReturnValue('ollama');
      (configService.getProviderConfig as jest.Mock).mockReturnValue({ model: 'llama3' });
      await handler.handleCommand('/model gpt-4');
      expect(configService.setProviderConfig).toHaveBeenCalled();
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /context', async () => {
      (contextService.getContext as jest.Mock).mockResolvedValue({
        cwd: '/test',
        git: { branch: 'main' }
      });
      await handler.handleCommand('/context');
      expect(contextService.getContext).toHaveBeenCalled();
      expect(uiRenderer.renderBox).toHaveBeenCalled();
    });

    it('should handle /exec', async () => {
      await handler.handleCommand('/exec ls -la');
      expect(chatService.executeCommand).toHaveBeenCalledWith('ls -la');
    });

    it('should handle /explain', async () => {
      await handler.handleCommand('/explain ls -la');
      expect(chatService.explainCommand).toHaveBeenCalledWith('ls -la');
    });

    it('should handle /suggest', async () => {
      await handler.handleCommand('/suggest list files');
      expect(chatService.suggestCommand).toHaveBeenCalledWith('list files');
    });

    it('should handle /debug', async () => {
      await handler.handleCommand('/debug error message');
      expect(chatService.debugError).toHaveBeenCalledWith('error message');
    });

    it('should handle /analyze security', async () => {
      mockedAnalysisService.analyzeSecurity.mockResolvedValue([
        { file: 'src/index.ts', line: 10, message: 'issue', severity: 'High' }
      ]);
      await handler.handleCommand('/analyze security src/index.ts');
      expect(mockedAnalysisService.analyzeSecurity).toHaveBeenCalledWith('src/index.ts');
      expect(uiRenderer.renderBox).toHaveBeenCalled();
    });

    it('should handle /analyze complexity', async () => {
      mockedAnalysisService.analyzeComplexity.mockReturnValue([
        { file: 'src/index.ts', line: 15, message: 'complex', severity: 'High' }
      ]);
      await handler.handleCommand('/analyze complexity src/index.ts');
      expect(mockedAnalysisService.analyzeComplexity).toHaveBeenCalledWith('src/index.ts');
      expect(uiRenderer.renderBox).toHaveBeenCalled();
    });

    it('should handle /agent', async () => {
      mockedAgentService.setCurrentAgent.mockReturnValue({ name: 'developer', description: '' } as any);
      await handler.handleCommand('/agent developer');
      expect(mockedAgentService.setCurrentAgent).toHaveBeenCalledWith('developer');
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /index', async () => {
      await handler.handleCommand('/index');
      expect(ragService.indexCodebase).toHaveBeenCalled();
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /mcp', async () => {
      await handler.handleCommand('/mcp connect test cmd');
      expect(mcpService.connect).toHaveBeenCalledWith('test', 'cmd', []);
      expect(mockedToolService.registerMCPTools).toHaveBeenCalledWith(['test']);
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /docs init', async () => {
      await handler.handleCommand('/docs init');
      expect(docsService.ensureDocsDirectory).toHaveBeenCalled();
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /docs refresh', async () => {
      await handler.handleCommand('/docs refresh');
      expect(docsService.ensureDocsDirectory).toHaveBeenCalled();
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle /docs view design', async () => {
      mockedDocsService.getDesignDoc.mockResolvedValueOnce('Design Doc');
      await handler.handleCommand('/docs view design');
      expect(mockedDocsService.getDesignDoc).toHaveBeenCalled();
      expect(uiRenderer.renderBox).toHaveBeenCalledWith(expect.stringContaining('Design'), expect.any(String), expect.any(Object));
    });

    it('should handle unknown command', async () => {
      await handler.handleCommand('/unknown');
      expect(uiRenderer.renderError).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
    });
  });
});
