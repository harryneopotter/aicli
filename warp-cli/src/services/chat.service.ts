import { Message, LLMConfig, LLMProvider } from '../types';
import { providerFactory } from '../providers';
import { sessionService } from './session.service';
import { contextService } from './context.service';
import { configService } from './config.service';
import { uiRenderer } from '../ui/renderer';
import { tokenTrackerService } from './token-tracker.service';

export class ChatService {
  private currentProvider?: LLMProvider;

  async initialize(): Promise<void> {
    await this.switchProvider(configService.get('defaultProvider'));
  }

  /**
   * Estimate token count from text
   * Rough estimate: 1 token ≈ 4 characters for English text
   * @param text Text to estimate
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async switchProvider(providerName: 'ollama' | 'openai' | 'anthropic' | 'gemini'): Promise<void> {
    const providerConfig = configService.getProviderConfig(providerName);

    if (!providerConfig) {
      throw new Error(`Provider ${providerName} is not configured`);
    }

    const config: LLMConfig = {
      provider: providerName,
      model: (providerConfig as any).model,
      apiKey: (providerConfig as any).apiKey,
      endpoint: (providerConfig as any).endpoint,
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9
    };

    this.currentProvider = await providerFactory.getProvider(config);

    // Check if provider is available
    const isAvailable = await this.currentProvider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider ${providerName} is not available. Please check your configuration.`);
    }
  }

  async chat(userMessage: string, options?: { streaming?: boolean }): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No provider initialized');
    }

    const session = sessionService.getCurrentSession();
    if (!session) {
      throw new Error('No active session');
    }

    // Add user message to session
    const userMsg = sessionService.addMessage('user', userMessage);
    uiRenderer.renderMessage(userMsg);

    // Build context and system prompt
    const context = await contextService.getContext();
    const systemPrompt = contextService.buildSystemPrompt(context);

    // Prepare messages for LLM
    const messages: Message[] = [
      {
        id: 'system',
        role: 'system',
        content: systemPrompt,
        timestamp: new Date()
      },
      ...sessionService.getLastNMessages(configService.get('context').maxHistory)
    ];

    try {
      let response: string;

      if (options?.streaming && this.currentProvider.streamChat) {
        // Streaming response
        uiRenderer.startStreamingResponse();
        const chunks: string[] = [];

        for await (const chunk of this.currentProvider.streamChat(messages)) {
          chunks.push(chunk);
          uiRenderer.renderStreamingChunk(chunk);
        }

        uiRenderer.endStreamingResponse();
        response = chunks.join('');
      } else {
        // Non-streaming response
        uiRenderer.renderLoading('Thinking...');
        response = await this.currentProvider.chat(messages);
        uiRenderer.stopLoading();
      }

      // Add assistant response to session
      const assistantMsg = sessionService.addMessage('assistant', response, {
        provider: this.currentProvider.name,
        model: configService.get('defaultProvider')
      });

      if (!options?.streaming) {
        uiRenderer.renderMessage(assistantMsg);
      }

      // Track token usage (estimated)
      const inputText = messages.map(m => m.content).join('\n');
      const inputTokens = this.estimateTokens(inputText);
      const outputTokens = this.estimateTokens(response);

      const providerConfig = configService.getProviderConfig(configService.get('defaultProvider'));
      const model = (providerConfig as any)?.model || 'unknown';

      tokenTrackerService.trackUsage(
        this.currentProvider.name,
        model,
        inputTokens,
        outputTokens
      );

      return response;
    } catch (error: any) {
      uiRenderer.stopLoading();
      throw new Error(`Chat error: ${error.message}`);
    }
  }

  async executeCommand(command: string): Promise<void> {
    uiRenderer.renderLoading(`Executing: ${command}`);

    try {
      const result = await contextService.executeCommand(command);
      uiRenderer.stopLoading();

      if (result.error) {
        uiRenderer.renderWarning('Command completed with warnings');
      }

      uiRenderer.renderCodeBlock(result.output, 'shell');

      // Add command and output to session context
      sessionService.addMessage('system', `Command: ${command}\n\nOutput:\n${result.output}`, {
        type: 'command_execution',
        command,
        output: result.output,
        error: result.error
      });
    } catch (error: any) {
      uiRenderer.stopLoading();
      uiRenderer.renderError(`Command execution failed: ${error.message}`);
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

  async checkProviderStatus(): Promise<{
    provider: string;
    available: boolean;
    error?: string;
  }> {
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

export const chatService = new ChatService();
