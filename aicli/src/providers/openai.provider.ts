import OpenAI from 'openai';
import { BaseLLMProvider } from './base.provider';
import { LLMConfig, Message } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  name = 'openai';
  private client?: OpenAI;

  async initialize(config: LLMConfig): Promise<void> {
    await super.initialize(config);
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async chat(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized');
    }

    const effectiveConfig = this.getEffectiveConfig(config);

    try {
      const response = await this.client.chat.completions.create({
        model: effectiveConfig.model || 'gpt-4-turbo-preview',
        messages: this.formatMessages(messages) as any,
        temperature: effectiveConfig.temperature || 0.7,
        max_tokens: effectiveConfig.maxTokens || 2000,
        top_p: effectiveConfig.topP || 0.9
      });

      return response.choices[0]?.message?.content || 'No response from OpenAI';
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async *streamChat(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized');
    }

    const effectiveConfig = this.getEffectiveConfig(config);

    try {
      const stream = await this.client.chat.completions.create({
        model: effectiveConfig.model || 'gpt-4-turbo-preview',
        messages: this.formatMessages(messages) as any,
        temperature: effectiveConfig.temperature || 0.7,
        max_tokens: effectiveConfig.maxTokens || 2000,
        top_p: effectiveConfig.topP || 0.9,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      throw new Error(`OpenAI streaming error: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.client) {return false;}
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
