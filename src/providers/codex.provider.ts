import { LLMProvider, LLMConfig, Message } from "../types";

export class CodexProvider implements LLMProvider {
  name = "codex";

  async initialize(_config: LLMConfig): Promise<void> {
    // Legacy OpenAI Codex models - redirect to OpenAI provider
  }

  async chat(
    _messages: Message[],
    _config?: Partial<LLMConfig>,
  ): Promise<string> {
    return "Codex is deprecated. Use OpenAI provider with models like gpt-4 or code-davinci-002 equivalents.";
  }

  async isAvailable(): Promise<boolean> {
    return false; // Deprecated, use OpenAI instead
  }
}
