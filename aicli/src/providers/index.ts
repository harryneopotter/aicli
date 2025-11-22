import { LLMProvider, LLMConfig } from '../types';
import { OllamaProvider } from './ollama.provider';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { GlmProvider } from './glm.provider';

export class ProviderFactory {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('glm', new GlmProvider());
  }

  async getProvider(config: LLMConfig): Promise<LLMProvider> {
    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }

    await provider.initialize(config);
    return provider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async checkProvider(providerName: string, config: LLMConfig): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) return false;

    try {
      await provider.initialize(config);
      return await provider.isAvailable();
    } catch {
      return false;
    }
  }
}

export const providerFactory = new ProviderFactory();

export { OllamaProvider, OpenAIProvider, AnthropicProvider, GeminiProvider, GlmProvider };
