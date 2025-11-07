import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base.provider';
import { LLMConfig, Message } from '../types';
import { rateLimiter, withRetry } from '../utils/rate-limiter';

export class AnthropicProvider extends BaseLLMProvider {
  name = 'anthropic';
  private client?: Anthropic;

  async initialize(config: LLMConfig): Promise<void> {
    await super.initialize(config);
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async chat(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic provider not initialized');
    }

    const effectiveConfig = this.getEffectiveConfig(config);

    // Separate system messages from conversation
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

    // Apply rate limiting (50 requests per minute for Anthropic)
    await rateLimiter.throttle('anthropic', 50, 60000);

    try {
      const response = await withRetry(async () => {
        return await this.client!.messages.create({
          model: effectiveConfig.model || 'claude-3-5-sonnet-20241022',
          max_tokens: effectiveConfig.maxTokens || 2000,
          temperature: effectiveConfig.temperature || 0.7,
          system: systemPrompt || undefined,
          messages: conversationMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }))
        });
      });

      const textContent = response.content.find(c => c.type === 'text');
      return textContent && 'text' in textContent ? textContent.text : 'No response from Claude';
    } catch (error: any) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  async *streamChat(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error('Anthropic provider not initialized');
    }

    const effectiveConfig = this.getEffectiveConfig(config);

    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

    // Apply rate limiting
    await rateLimiter.throttle('anthropic', 50, 60000);

    try {
      const stream = await withRetry(async () => {
        return await this.client!.messages.stream({
          model: effectiveConfig.model || 'claude-3-5-sonnet-20241022',
          max_tokens: effectiveConfig.maxTokens || 2000,
          temperature: effectiveConfig.temperature || 0.7,
          system: systemPrompt || undefined,
          messages: conversationMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }))
        });
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } catch (error: any) {
      throw new Error(`Anthropic streaming error: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.client) return false;
      // Simple health check - try to get account info
      await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch {
      return false;
    }
  }
}
