import { CommandHandler } from '../handlers';
import { uiRenderer } from '../../ui/renderer';
import { sessionService } from '../../services/session.service';
import { chatService } from '../../services/chat.service';
import { configService } from '../../services/config.service';
import { contextService } from '../../services/context.service';
import { analysisService } from '../../services/analysis.service';
import { agentService } from '../../services/agent.service';
import { trainingService } from '../../services/training.service';
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
jest.mock('../../services/training.service');
jest.mock('../../services/rag.service');
jest.mock('../../services/mcp.service');
jest.mock('../../services/tool.service');
jest.mock('../../services/docs.service');

describe('CommandHandler', () => {
  let handler: CommandHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new CommandHandler();
  });

  describe('handleCommand', () => {
    it('should return false for non-commands', async () => {
      const result = await handler.handleCommand('hello world');
      expect(result).toBe(false);
    });

    it('should handle /help', async () => {
      await handler.handleCommand('/help');
      expect(uiRenderer.renderBox).toHaveBeenCalledWith(
        expect.stringContaining('Help'),
        expect.any(String)
      );
    });

    it('should handle /clear', async () => {
      await handler.handleCommand('/clear');
      expect(uiRenderer.clear).toHaveBeenCalled();
      expect(sessionService.clearMessages).toHaveBeenCalled();
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
      (sessionService.listSessions as jest.Mock).mockResolvedValue([
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

    it('should handle /analyze', async () => {
      (analysisService.analyzeProject as jest.Mock).mockResolvedValue({
        summary: 'test',
        complexity: 'low',
        suggestions: []
      });
      await handler.handleCommand('/analyze');
      expect(analysisService.analyzeProject).toHaveBeenCalled();
      expect(uiRenderer.renderBox).toHaveBeenCalled();
    });

    it('should handle /agent', async () => {
      await handler.handleCommand('/agent developer');
      expect(agentService.switchAgent).toHaveBeenCalledWith('developer');
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
      expect(uiRenderer.renderSuccess).toHaveBeenCalled();
    });

    it('should handle unknown command', async () => {
      await handler.handleCommand('/unknown');
      expect(uiRenderer.renderError).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
    });
  });
});
