import fetch, { type RequestInit } from 'node-fetch';
import { BaseLLMProvider } from './base.provider';
import { LLMConfig, Message } from '../types';
import { secureConfigService } from '../services/secure-config.service';
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200
});

// Adjusted limitedFetch to use the correct arguments
const limitedFetch = limiter.wrap((url: string, options: RequestInit) => fetch(url, options));

export class GeminiProvider extends BaseLLMProvider {
  name = 'gemini';

  async chat(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    const effectiveConfig = this.getEffectiveConfig(config);

    // Fetch API key from secure storage
    const apiKey = await secureConfigService.getApiKey('gemini');
    if (!apiKey) {
      throw new Error('Gemini API key is required. Please set it using the config command.');
    }

    const model = effectiveConfig.model || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Convert messages to Gemini format
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Add system prompt as first user message
    if (systemMessages.length > 0) {
      contents.unshift({
        role: 'user',
        parts: [{ text: `System: ${systemMessages.map(m => m.content).join('\n\n')}` }]
      });
    }

    try {
      const response = await limitedFetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: effectiveConfig.temperature || 0.7,
            topP: effectiveConfig.topP || 0.9,
            maxOutputTokens: effectiveConfig.maxTokens || 2000
          }
        })
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('No response content from Gemini API');
      }

      return content;
    } catch (error: any) {
      throw new Error(`Failed to call Gemini API: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Fetch API key from secure storage
      const apiKey = await secureConfigService.getApiKey('gemini');
      if (!apiKey) return false;

      // Test with a simple request
      const model = this.config?.model || 'gemini-1.5-flash';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const response = await limitedFetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'test' }] }]
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
