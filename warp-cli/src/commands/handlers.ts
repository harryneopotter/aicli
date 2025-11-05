import { uiRenderer } from '../ui/renderer';
import { sessionService } from '../services/session.service';
import { chatService } from '../services/chat.service';
import { configService } from '../services/config.service';
import { contextService } from '../services/context.service';
import { format } from 'date-fns';

export class CommandHandler {
  async handleCommand(input: string): Promise<boolean> {
    const trimmed = input.trim();

    // Check if it's a command (starts with /)
    if (!trimmed.startsWith('/')) {
      return false;
    }

    const [command, ...args] = trimmed.slice(1).split(/\s+/);
    const argsString = args.join(' ');

    try {
      switch (command.toLowerCase()) {
        case 'help':
          await this.handleHelp();
          break;

        case 'clear':
          await this.handleClear();
          break;

        case 'exit':
        case 'quit':
          await this.handleExit();
          return true; // Signal to exit

        case 'new':
          await this.handleNew(argsString);
          break;

        case 'save':
          await this.handleSave(argsString);
          break;

        case 'load':
          await this.handleLoad(argsString);
          break;

        case 'list':
          await this.handleList();
          break;

        case 'delete':
          await this.handleDelete(argsString);
          break;

        case 'search':
          await this.handleSearch(argsString);
          break;

        case 'export':
          await this.handleExport(argsString);
          break;

        case 'config':
          await this.handleConfig();
          break;

        case 'provider':
          await this.handleProvider(argsString);
          break;

        case 'model':
          await this.handleModel(argsString);
          break;

        case 'context':
          await this.handleContext();
          break;

        case 'exec':
          await this.handleExec(argsString);
          break;

        case 'git':
          await this.handleGit(argsString);
          break;

        case 'stats':
          await this.handleStats();
          break;

        case 'explain':
          await this.handleExplain(argsString);
          break;

        case 'suggest':
          await this.handleSuggest(argsString);
          break;

        default:
          uiRenderer.renderError(`Unknown command: /${command}. Type /help for available commands.`);
      }
    } catch (error: any) {
      uiRenderer.renderError(error.message);
    }

    return false;
  }

  private async handleHelp(): Promise<void> {
    uiRenderer.renderHelp();
  }

  private async handleClear(): Promise<void> {
    uiRenderer.clear();
    uiRenderer.renderWelcome();
  }

  private async handleExit(): Promise<void> {
    uiRenderer.renderInfo('Saving session and exiting...');
    await sessionService.cleanup();
    process.exit(0);
  }

  private async handleNew(name?: string): Promise<void> {
    const session = await sessionService.createSession(name);
    uiRenderer.renderSuccess(`New session created: ${session.name}`);
    uiRenderer.renderSessionInfo({
      name: session.name,
      messageCount: session.messages.length,
      created: session.created
    });
  }

  private async handleSave(name?: string): Promise<void> {
    const session = sessionService.getCurrentSession();
    if (!session) {
      throw new Error('No active session to save');
    }

    if (name) {
      session.name = name;
    }

    await sessionService.saveCurrentSession();
    uiRenderer.renderSuccess(`Session saved: ${session.name} (ID: ${session.id})`);
  }

  private async handleLoad(id: string): Promise<void> {
    if (!id) {
      throw new Error('Please provide a session ID. Use /list to see available sessions.');
    }

    const session = await sessionService.loadSession(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    uiRenderer.renderSuccess(`Loaded session: ${session.name}`);
    uiRenderer.renderSessionInfo({
      name: session.name,
      messageCount: session.messages.length,
      created: session.created
    });

    // Display recent messages
    if (session.messages.length > 0) {
      uiRenderer.renderInfo('Recent messages:');
      session.messages.slice(-3).forEach(msg => {
        uiRenderer.renderMessage(msg);
      });
    }
  }

  private async handleList(): Promise<void> {
    const sessions = await sessionService.listSessions();

    if (sessions.length === 0) {
      uiRenderer.renderInfo('No sessions found.');
      return;
    }

    const headers = ['ID', 'Name', 'Created', 'Updated'];
    const rows = sessions.map(s => [
      s.id.substring(0, 8),
      s.name,
      format(s.created, 'MMM dd, yyyy HH:mm'),
      format(s.updated, 'MMM dd, yyyy HH:mm')
    ]);

    uiRenderer.renderTable(headers, rows);
  }

  private async handleDelete(id: string): Promise<void> {
    if (!id) {
      throw new Error('Please provide a session ID to delete.');
    }

    await sessionService.deleteSession(id);
    uiRenderer.renderSuccess(`Session deleted: ${id}`);
  }

  private async handleSearch(query: string): Promise<void> {
    if (!query) {
      throw new Error('Please provide a search query.');
    }

    const sessions = await sessionService.searchSessions(query);

    if (sessions.length === 0) {
      uiRenderer.renderInfo('No matching sessions found.');
      return;
    }

    const headers = ['ID', 'Name', 'Created'];
    const rows = sessions.map(s => [
      s.id.substring(0, 8),
      s.name,
      format(s.created, 'MMM dd, yyyy HH:mm')
    ]);

    uiRenderer.renderTable(headers, rows);
  }

  private async handleExport(args: string): Promise<void> {
    const [id, format] = args.split(/\s+/);

    if (!id) {
      throw new Error('Please provide a session ID to export.');
    }

    const exportFormat = (format as 'json' | 'markdown') || 'json';
    const data = await sessionService.exportSession(id, exportFormat);

    console.log(data);
  }

  private async handleConfig(): Promise<void> {
    const config = configService.getAll();
    uiRenderer.renderBox('Current Configuration', JSON.stringify(config, null, 2), {
      color: 'cyan'
    });
  }

  private async handleProvider(name: string): Promise<void> {
    if (!name) {
      const current = chatService.getCurrentProvider();
      uiRenderer.renderInfo(`Current provider: ${current}`);
      return;
    }

    const validProviders = ['ollama', 'openai', 'anthropic', 'gemini'];
    if (!validProviders.includes(name)) {
      throw new Error(`Invalid provider. Choose from: ${validProviders.join(', ')}`);
    }

    await chatService.switchProvider(name as any);
    configService.set('defaultProvider', name as any);
    uiRenderer.renderSuccess(`Switched to provider: ${name}`);
  }

  private async handleModel(name: string): Promise<void> {
    if (!name) {
      throw new Error('Please provide a model name.');
    }

    const provider = configService.get('defaultProvider');
    const providerConfig = configService.getProviderConfig(provider);

    if (providerConfig) {
      (providerConfig as any).model = name;
      configService.setProviderConfig(provider, providerConfig);
      uiRenderer.renderSuccess(`Model set to: ${name}`);
    }
  }

  private async handleContext(): Promise<void> {
    const context = await contextService.getContext();
    uiRenderer.renderBox('Current Context', JSON.stringify(context, null, 2), {
      color: 'cyan'
    });
  }

  private async handleExec(command: string): Promise<void> {
    if (!command) {
      throw new Error('Please provide a command to execute.');
    }

    await chatService.executeCommand(command);
  }

  private async handleGit(args: string): Promise<void> {
    await chatService.executeCommand(`git ${args}`);
  }

  private async handleStats(): Promise<void> {
    const stats = await sessionService.getSessionStats();

    const statsText = [
      `Total Sessions: ${stats.totalSessions}`,
      `Total Messages: ${stats.totalMessages}`,
      stats.oldestSession ? `Oldest Session: ${format(stats.oldestSession, 'MMM dd, yyyy')}` : '',
      stats.newestSession ? `Newest Session: ${format(stats.newestSession, 'MMM dd, yyyy')}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    uiRenderer.renderBox('Statistics', statsText, { color: 'green' });
  }

  private async handleExplain(command: string): Promise<void> {
    if (!command) {
      throw new Error('Please provide a command to explain.');
    }

    await chatService.explainCommand(command);
  }

  private async handleSuggest(task: string): Promise<void> {
    if (!task) {
      throw new Error('Please describe the task.');
    }

    await chatService.suggestCommand(task);
  }
}

export const commandHandler = new CommandHandler();
