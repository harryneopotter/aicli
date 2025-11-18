import { ConfigService } from './services/config.service';
import { ContextService } from './services/context.service';
import { SessionStorage } from './storage/session.storage';
import { SessionService } from './services/session.service';
import { ProviderFactory } from './providers';
import { WarpUIRenderer } from './ui/renderer';
import { ChatService } from './services/chat.service';
import { CommandHandler } from './commands/handlers';
import { PluginService } from './services/plugin.service';
import { AutocompleteService } from './services/autocomplete.service';

class AppContainer {
  readonly configService = new ConfigService();
  readonly contextService = new ContextService();
  readonly uiRenderer = new WarpUIRenderer();
  readonly providerFactory = new ProviderFactory();
  readonly sessionStorage = new SessionStorage(this.configService.getSessionDirectory());
  readonly pluginService = new PluginService();
  readonly autocompleteService = new AutocompleteService(this.pluginService);
  readonly sessionService = new SessionService({
    contextService: this.contextService,
    configService: this.configService,
    storage: this.sessionStorage
  });
  readonly chatService = new ChatService({
    providerFactory: this.providerFactory,
    sessionService: this.sessionService,
    contextService: this.contextService,
    configService: this.configService,
    uiRenderer: this.uiRenderer
  });
  readonly commandHandler = new CommandHandler({
    uiRenderer: this.uiRenderer,
    sessionService: this.sessionService,
    chatService: this.chatService,
    configService: this.configService,
    contextService: this.contextService,
    pluginService: this.pluginService,
    autocompleteService: this.autocompleteService
  });
}

export const container = new AppContainer();
