import fetch from "node-fetch";
import { BaseLLMProvider } from "./base.provider";
import { LLMConfig, Message } from "../types";

export class GeminiProvider extends BaseLLMProvider {
  name = "gemini";

  async chat(
    messages: Message[],
    config?: Partial<LLMConfig>,
  ): Promise<string> {
    const effectiveConfig = this.getEffectiveConfig(config);

    if (!effectiveConfig.apiKey) {
      throw new Error("Gemini API key is required");
    }

    const model = effectiveConfig.model || "gemini-1.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Convert messages to Gemini format
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const contents = conversationMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Add system prompt as first user message
    if (systemMessages.length > 0) {
      contents.unshift({
        role: "user",
        parts: [
          {
            text: `System: ${systemMessages.map((m) => m.content).join("\n\n")}`,
          },
        ],
      });
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveConfig.apiKey}`
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: effectiveConfig.temperature || 0.7,
            topP: effectiveConfig.topP || 0.9,
            maxOutputTokens: effectiveConfig.maxTokens || 2000,
          },
        }),
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new Error(
          `Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`,
        );
      }

      const data: any = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error("No response content from Gemini API");
      }

      return content;
    } catch (error: any) {
      throw new Error(`Failed to call Gemini API: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config?.apiKey) return false;

      // Test with a simple request
      const model = this.config.model || "gemini-1.5-flash";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "test" }] }],
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
