import { Message, LLMConfig, LLMProvider } from '../types';
import { ProviderFactory } from '../providers';
import { SessionService } from './session.service';
import { ContextService } from './context.service';
import { ConfigService } from './config.service';
import { WarpUIRenderer } from '../ui/renderer';

type ChatServiceDeps = {
  providerFactory: ProviderFactory;
  sessionService: SessionService;
  contextService: ContextService;
  configService: ConfigService;
  uiRenderer: WarpUIRenderer;
};

export class ChatService {
  private currentProvider?: LLMProvider;
  private readonly providerFactory: ProviderFactory;
  private readonly sessionService: SessionService;
  private readonly contextService: ContextService;
  private readonly configService: ConfigService;
  private readonly uiRenderer: WarpUIRenderer;

  constructor({ providerFactory, sessionService, contextService, configService, uiRenderer }: ChatServiceDeps) {
    this.providerFactory = providerFactory;
    this.sessionService = sessionService;
    this.contextService = contextService;
    this.configService = configService;
    this.uiRenderer = uiRenderer;
  }

  async initialize(): Promise<void> {
    await this.switchProvider(this.configService.get('defaultProvider'));
  }

  async switchProvider(providerName: 'ollama' | 'openai' | 'anthropic' | 'gemini'): Promise<void> {
    const providerConfig = this.configService.getProviderConfig(providerName);

    if (!providerConfig) {
      throw new Error(`Provider ${providerName} is not configured`);
    }

    const config: LLMConfig = {
      provider: providerName,
      model: (providerConfig as any).model,
      endpoint: (providerConfig as any).endpoint,
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9
    };

    this.currentProvider = await this.providerFactory.getProvider(config);

    const isAvailable = await this.currentProvider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider ${providerName} is not available. Please check your configuration.`);
    }
  }

  async chat(userMessage: string, options?: { streaming?: boolean }): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No provider initialized');
    }

    const session = this.sessionService.getCurrentSession();
    if (!session) {
      throw new Error('No active session');
    }

    const userMsg = this.sessionService.addMessage('user', userMessage);
    this.uiRenderer.renderMessage(userMsg);

    const context = await this.contextService.getContext();
    const systemPrompt = this.contextService.buildSystemPrompt(context);

    const messages: Message[] = [
      {
        id: 'system',
        role: 'system',
        content: systemPrompt,
        timestamp: new Date()
      },
      ...this.sessionService.getLastNMessages(this.configService.get('context').maxHistory)
    ];

    try {
      let response: string;

      if (options?.streaming && this.currentProvider.streamChat) {
        this.uiRenderer.startStreamingResponse();
        const chunks: string[] = [];

        for await (const chunk of this.currentProvider.streamChat(messages)) {
          chunks.push(chunk);
          this.uiRenderer.renderStreamingChunk(chunk);
        }

        this.uiRenderer.endStreamingResponse();
        response = chunks.join('');
      } else {
        this.uiRenderer.renderLoading('Thinking...');
        response = await this.currentProvider.chat(messages);
        this.uiRenderer.stopLoading();
      }

      const assistantMsg = this.sessionService.addMessage('assistant', response, {
        provider: this.currentProvider.name,
        model: this.configService.get('defaultProvider')
      });

      if (!options?.streaming) {
        this.uiRenderer.renderMessage(assistantMsg);
      }

      return response;
    } catch (error: any) {
      this.uiRenderer.stopLoading();
      throw new Error(`Chat error: ${error.message}`);
    }
  }

  async executeCommand(command: string): Promise<void> {
    this.uiRenderer.renderLoading(`Executing: ${command}`);

    try {
      const result = await this.contextService.executeCommand(command);
      this.uiRenderer.stopLoading();

      if (result.error) {
        this.uiRenderer.renderWarning('Command completed with warnings');
      }

      this.uiRenderer.renderCodeBlock(result.output, 'shell');

      this.sessionService.addMessage('system', `Command: ${command}\n\nOutput:\n${result.output}`, {
        type: 'command_execution',
        command,
        output: result.output,
        error: result.error
      });
    } catch (error: any) {
      this.uiRenderer.stopLoading();
      this.uiRenderer.renderError(`Command execution failed: ${error.message}`);
    }
  }

  async explainCommand(command: string): Promise<string> {
    const prompt = `Explain this command in detail:\n\n${command}\n\nInclude:\n1. What it does\n2. Any potential risks\n3. Common use cases`;
    return await this.chat(prompt);
  }

  async suggestCommand(task: string): Promise<string> {
    const prompt = `Suggest a command to accomplish this task:\n\n${task}\n\nProvide:\n1. The command\n2. Explanation of what it does\n3. Any important notes or warnings`;
    return await this.chat(prompt);
  }

  async debugError(error: string): Promise<string> {
    const prompt = `Help me debug this error:\n\n${error}\n\nProvide:\n1. What the error means\n2. Common causes\n3. Suggested solutions`;
    return await this.chat(prompt);
  }

  getCurrentProvider(): string {
    return this.currentProvider?.name || 'none';
  }

  async checkProviderStatus(): Promise<{ provider: string; available: boolean; error?: string }> {
    if (!this.currentProvider) {
      return {
        provider: 'none',
        available: false,
        error: 'No provider initialized'
      };
    }

    try {
      const available = await this.currentProvider.isAvailable();
      return {
        provider: this.currentProvider.name,
        available
      };
    } catch (error: any) {
      return {
        provider: this.currentProvider.name,
        available: false,
        error: error.message
      };
    }
  }
}
