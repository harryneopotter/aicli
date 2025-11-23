import { LLMProvider, LLMConfig, Message } from '../types';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  protected config?: LLMConfig;

  async initialize(config: LLMConfig): Promise<void> {
    this.config = config;
  }

  abstract chat(messages: Message[], config?: Partial<LLMConfig>): Promise<string>;

  abstract isAvailable(): Promise<boolean>;

  protected formatMessages(messages: Message[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  protected getEffectiveConfig(overrides?: Partial<LLMConfig>): LLMConfig {
    return {
      ...this.config,
      ...overrides
    } as LLMConfig;
  }
}
