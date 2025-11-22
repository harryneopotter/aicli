import fetch from 'node-fetch';
import { BaseLLMProvider } from './base.provider';
import { LLMConfig, Message } from '../types';

export class OllamaProvider extends BaseLLMProvider {
  name = 'ollama';

  async chat(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    const effectiveConfig = this.getEffectiveConfig(config);
    const endpoint = effectiveConfig.endpoint || 'http://localhost:11434';

    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: effectiveConfig.model || 'llama3.2',
          messages: this.formatMessages(messages),
          stream: false,
          options: {
            temperature: effectiveConfig.temperature || 0.7,
            top_p: effectiveConfig.topP || 0.9,
            num_predict: effectiveConfig.maxTokens || 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.message?.content || 'No response from Ollama';
    } catch (error: any) {
      throw new Error(`Failed to connect to Ollama: ${error.message}`);
    }
  }

  async *streamChat(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string> {
    const effectiveConfig = this.getEffectiveConfig(config);
    const endpoint = effectiveConfig.endpoint || 'http://localhost:11434';

    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: effectiveConfig.model || 'llama3.2',
          messages: this.formatMessages(messages),
          stream: true,
          options: {
            temperature: effectiveConfig.temperature || 0.7,
            top_p: effectiveConfig.topP || 0.9,
            num_predict: effectiveConfig.maxTokens || 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const reader = response.body;
      if (!reader) throw new Error('No response body');

      let buffer = '';
      for await (const chunk of reader as any) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                yield data.message.content;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to stream from Ollama: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const endpoint = this.config?.endpoint || 'http://localhost:11434';
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async embed(text: string): Promise<number[]> {
    const effectiveConfig = this.getEffectiveConfig();
    const endpoint = effectiveConfig.endpoint || 'http://localhost:11434';

    try {
      const response = await fetch(`${endpoint}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: effectiveConfig.model || 'llama3.2',
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama Embeddings API error: ${response.status}`);
      }

      const data: any = await response.json();
      return data.embedding;
    } catch (error: any) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }
}
