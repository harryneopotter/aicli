import { format } from 'date-fns';
import { ContextService, sanitizeError } from '../services/context.service';
import { SessionService } from '../services/session.service';
import { ChatService } from '../services/chat.service';
import { ConfigService } from '../services/config.service';
import { WarpUIRenderer } from '../ui/renderer';
import { PluginService } from '../services/plugin.service';
import { AutocompleteService } from '../services/autocomplete.service';

type CommandHandlerDeps = {
  uiRenderer: WarpUIRenderer;
  sessionService: SessionService;
  chatService: ChatService;
  configService: ConfigService;
  contextService: ContextService;
  pluginService: PluginService;
  autocompleteService: AutocompleteService;
};

export class CommandHandler {
  private readonly uiRenderer: WarpUIRenderer;
  private readonly sessionService: SessionService;
  private readonly chatService: ChatService;
  private readonly configService: ConfigService;
  private readonly contextService: ContextService;
  private readonly pluginService: PluginService;
  private readonly autocompleteService: AutocompleteService;

  constructor({ uiRenderer, sessionService, chatService, configService, contextService, pluginService, autocompleteService }: CommandHandlerDeps) {
    this.uiRenderer = uiRenderer;
    this.sessionService = sessionService;
    this.chatService = chatService;
    this.configService = configService;
    this.contextService = contextService;
    this.pluginService = pluginService;
    this.autocompleteService = autocompleteService;
  }

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
          return true;
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
        case 'ctxfile':
          await this.handleContextFiles(argsString);
          break;
        case 'exec':
          await this.handleExec(argsString);
          break;
        case 'git':
          await this.handleGit(argsString);
          break;
        case 'diff':
          await this.handleDiff(argsString);
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
        case 'plugins':
          await this.handlePlugins();
          break;
        case 'plugin':
          await this.handlePlugin(argsString);
          break;
        case 'undo':
          await this.handleUndo();
          break;
        case 'autocomplete':
          await this.handleAutocomplete(argsString);
          break;
        default:
          this.uiRenderer.renderError(`Unknown command: /${command}. Type /help for available commands.`);
      }
    } catch (error: any) {
      const sanitizedError = sanitizeError(error);
      this.uiRenderer.renderError(sanitizedError);
    }

    return false;
  }

  private async handleHelp(): Promise<void> {
    this.uiRenderer.renderHelp();
  }

  private async handleClear(): Promise<void> {
    this.uiRenderer.clear();
    this.uiRenderer.renderWelcome();
  }

  private async handleExit(): Promise<void> {
    this.uiRenderer.renderInfo('Saving session and exiting...');
    await this.sessionService.cleanup();
    process.exit(0);
  }

  private async handleNew(name?: string): Promise<void> {
    const session = await this.sessionService.createSession(name);
    this.uiRenderer.renderSuccess(`New session created: ${session.name}`);
    this.uiRenderer.renderSessionInfo({
      name: session.name,
      messageCount: session.messages.length,
      created: session.created
    });
  }

  private async handleSave(name?: string): Promise<void> {
    const session = this.sessionService.getCurrentSession();
    if (!session) {
      throw new Error('No active session to save');
    }

    if (name) {
      session.name = name;
    }

    await this.sessionService.saveCurrentSession();
    this.uiRenderer.renderSuccess(`Session saved: ${session.name} (ID: ${session.id})`);
  }

  private async handleLoad(id: string): Promise<void> {
    if (!id) {
      throw new Error('Please provide a session ID. Use /list to see available sessions.');
    }

    const session = await this.sessionService.loadSession(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    this.uiRenderer.renderSuccess(`Loaded session: ${session.name}`);
    this.uiRenderer.renderSessionInfo({
      name: session.name,
      messageCount: session.messages.length,
      created: session.created
    });

    // Display recent messages
    if (session.messages.length > 0) {
      this.uiRenderer.renderInfo('Recent messages:');
      session.messages.slice(-3).forEach(msg => {
        this.uiRenderer.renderMessage(msg);
      });
    }
  }

  private async handleList(): Promise<void> {
    const sessions = await this.sessionService.listSessions();
    if (sessions.length === 0) {
      this.uiRenderer.renderInfo('No sessions found.');
      return;
    }
    const headers = ['ID', 'Name', 'Created', 'Updated'];
    const rows = sessions.map(s => [
      s.id.substring(0, 8),
      s.name,
      format(s.created, 'MMM dd, yyyy HH:mm'),
      format(s.updated, 'MMM dd, yyyy HH:mm')
    ]);
    this.uiRenderer.renderTable(headers, rows);
  }

  private async handleDelete(id: string): Promise<void> {
    if (!id) {
      throw new Error('Please provide a session ID to delete.');
    }

    await this.sessionService.deleteSession(id);
    this.uiRenderer.renderSuccess(`Session deleted: ${id}`);
  }

  private async handleSearch(query: string): Promise<void> {
    if (!query) {
      throw new Error('Please provide a search query.');
    }

    const sessions = await this.sessionService.searchSessions(query);

    if (sessions.length === 0) {
      this.uiRenderer.renderInfo('No matching sessions found.');
      return;
    }

    const headers = ['ID', 'Name', 'Created'];
    const rows = sessions.map(s => [
      s.id.substring(0, 8),
      s.name,
      format(s.created, 'MMM dd, yyyy HH:mm')
    ]);

    this.uiRenderer.renderTable(headers, rows);
  }

  private async handleExport(args: string): Promise<void> {
    const [id, format] = args.split(/\s+/);

    if (!id) {
      throw new Error('Please provide a session ID to export.');
    }

    const exportFormat = (format as 'json' | 'markdown') || 'json';
    const data = await this.sessionService.exportSession(id, exportFormat);

    console.log(data);
  }

  private async handleConfig(): Promise<void> {
    const config = this.configService.getAll();
    this.uiRenderer.renderBox('Current Configuration', JSON.stringify(config, null, 2), {
      color: 'cyan'
    });
  }

  private async handleProvider(name: string): Promise<void> {
    if (!name) {
      const current = this.chatService.getCurrentProvider();
      this.uiRenderer.renderInfo(`Current provider: ${current}`);
      return;
    }

    const validProviders = ['ollama', 'openai', 'anthropic', 'gemini'];
    if (!validProviders.includes(name)) {
      throw new Error(`Invalid provider. Choose from: ${validProviders.join(', ')}`);
    }

    await this.chatService.switchProvider(name as any);
    this.configService.set('defaultProvider', name as any);
    this.uiRenderer.renderSuccess(`Switched to provider: ${name}`);
  }

  private async handleModel(name: string): Promise<void> {
    if (!name) {
      throw new Error('Please provide a model name.');
    }

    const provider = this.configService.get('defaultProvider');
    const providerConfig = this.configService.getProviderConfig(provider);

    if (providerConfig) {
      (providerConfig as any).model = name;
      this.configService.setProviderConfig(provider, providerConfig);
      this.uiRenderer.renderSuccess(`Model set to: ${name}`);
    }
  }

  private async handleContext(): Promise<void> {
    const context = await this.contextService.getContext();
    this.uiRenderer.renderBox('Current Context', JSON.stringify(context, null, 2), {
      color: 'cyan'
    });
  }

  private async handleContextFiles(args: string): Promise<void> {
    const [action = 'list', ...rest] = args.split(/\s+/).filter(Boolean);
    switch (action) {
      case 'add': {
        const filePath = rest.join(' ');
        if (!filePath) {
          throw new Error('Usage: /ctxfile add <path>');
        }
        const attachment = await this.contextService.attachFile(filePath);
        this.uiRenderer.renderSuccess(`Attached ${attachment.path} (${attachment.size} bytes)`);
        break;
      }
      case 'remove': {
        const target = rest.join(' ');
        if (!target) {
          throw new Error('Usage: /ctxfile remove <path>');
        }
        const removed = this.contextService.removeAttachedFile(target);
        if (removed) {
          this.uiRenderer.renderSuccess(`Removed attachment: ${target}`);
        } else {
          this.uiRenderer.renderWarning(`Attachment not found: ${target}`);
        }
        break;
      }
      case 'clear': {
        this.contextService.clearAttachedFiles();
        this.uiRenderer.renderSuccess('Cleared all context file attachments.');
        break;
      }
      default: {
        const attachments = this.contextService.listAttachedFiles();
        if (attachments.length === 0) {
          this.uiRenderer.renderInfo('No context files attached. Use /ctxfile add <path>.');
          return;
        }
        const rows = attachments.map(file => [
          file.path,
          `${file.size} bytes`,
          new Date(file.updated).toLocaleString()
        ]);
        this.uiRenderer.renderTable(['Path', 'Size', 'Updated'], rows);
      }
    }
  }

  private async handleExec(command: string): Promise<void> {
    if (!command) {
      throw new Error('Please provide a command to execute.');
    }

    await this.chatService.executeCommand(command);
  }

  private async handleGit(args: string): Promise<void> {
    await this.chatService.executeCommand(`git ${args}`);
  }

  private async handleDiff(args: string): Promise<void> {
    const tokens = args.split(/\s+/).filter(Boolean);
    let staged = false;
    const targetParts: string[] = [];
    tokens.forEach(token => {
      if (token === '--staged') {
        staged = true;
      } else {
        targetParts.push(token);
      }
    });
    const target = targetParts.join(' ');
    const diff = await this.contextService.getDiff(target || undefined, { staged });
    if (!diff.trim() || diff === 'No changes detected.') {
      this.uiRenderer.renderInfo(diff.trim() ? diff : 'No changes detected.');
      return;
    }
    this.uiRenderer.renderCodeBlock(diff, 'diff');
  }

  private async handleStats(): Promise<void> {
    const stats = await this.sessionService.getSessionStats();

    const statsText = [
      `Total Sessions: ${stats.totalSessions}`,
      `Total Messages: ${stats.totalMessages}`,
      stats.oldestSession ? `Oldest Session: ${format(stats.oldestSession, 'MMM dd, yyyy')}` : '',
      stats.newestSession ? `Newest Session: ${format(stats.newestSession, 'MMM dd, yyyy')}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    this.uiRenderer.renderBox('Statistics', statsText, { color: 'green' });
  }

  private async handleExplain(command: string): Promise<void> {
    if (!command) {
      throw new Error('Please provide a command to explain.');
    }

    await this.chatService.explainCommand(command);
  }

  private async handleSuggest(task: string): Promise<void> {
    if (!task) {
      throw new Error('Please describe the task.');
    }

    await this.chatService.suggestCommand(task);
  }

  private async handlePlugins(): Promise<void> {
    const plugins = this.pluginService.listPlugins();
    if (plugins.length === 0) {
      this.uiRenderer.renderInfo('No plugins installed. Drop .js files into ~/.warp-cli/plugins to extend the CLI.');
      return;
    }
    const rows = plugins.map(plugin => [
      plugin.name,
      plugin.description,
      plugin.version || '—',
      plugin.source
    ]);
    this.uiRenderer.renderTable(['Name', 'Description', 'Version', 'Source'], rows);
  }

  private async handlePlugin(args: string): Promise<void> {
    const [name, ...pluginArgs] = args.split(/\s+/).filter(Boolean);
    if (!name) {
      throw new Error('Usage: /plugin <name> [args]');
    }
    const context = await this.contextService.getContext();
    const result = await this.pluginService.execute(name, pluginArgs, context);
    if (result.output) {
      this.uiRenderer.renderBox(`Plugin: ${name}`, result.output, { color: 'magenta' });
    }
    if (result.highlights?.length) {
      this.uiRenderer.renderList(result.highlights, true);
    }
    if (result.metadata) {
      this.uiRenderer.renderBox('Plugin Metadata', JSON.stringify(result.metadata, null, 2), { color: 'gray' });
    }
  }

  private async handleUndo(): Promise<void> {
    const { removed } = this.sessionService.undoLastInteraction();
    this.uiRenderer.renderSuccess(`Removed ${removed.length} message(s) from the session.`);
  }

  private async handleAutocomplete(prefix: string): Promise<void> {
    if (!prefix) {
      throw new Error('Usage: /autocomplete <prefix>');
    }
    const suggestions = this.autocompleteService.suggest(prefix);
    if (suggestions.length === 0) {
      this.uiRenderer.renderInfo('No suggestions found for that prefix.');
      return;
    }
    const rows = suggestions.map(item => [item.value, item.description || '']);
    this.uiRenderer.renderTable(['Suggestion', 'Description'], rows);
  }
}
