import fetch from "node-fetch";
import { BaseLLMProvider } from "./base.provider";
import { LLMConfig, Message } from "../types";

export class GlmProvider extends BaseLLMProvider {
    name = "glm";

    async chat(
        messages: Message[],
        config?: Partial<LLMConfig>,
    ): Promise<string> {
        const effectiveConfig = this.getEffectiveConfig(config);

        if (!effectiveConfig.apiKey) {
            throw new Error("GLM API key is required");
        }

        // GLM uses OpenAI-compatible API format
        const model = effectiveConfig.model || "GLM-4.6";
        const endpoint = effectiveConfig.endpoint || "https://api.z.ai/api/paas/v4";
        const apiUrl = `${endpoint}/chat/completions`;

        // Convert messages to OpenAI format (GLM is compatible)
        const formattedMessages = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${effectiveConfig.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: formattedMessages,
                    temperature: effectiveConfig.temperature || 0.7,
                    top_p: effectiveConfig.topP || 0.9,
                    max_tokens: effectiveConfig.maxTokens || 2000,
                }),
            });

            if (!response.ok) {
                const errorData: any = await response.json().catch(() => ({}));
                throw new Error(
                    `GLM API error: ${response.status} ${errorData.error?.message || response.statusText}`,
                );
            }

            const data: any = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error("No response content from GLM API");
            }

            return content;
        } catch (error: any) {
            throw new Error(`Failed to call GLM API: ${error.message}`);
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            if (!this.config?.apiKey) return false;

            // Test with a simple request
            const endpoint = this.config.endpoint || "https://api.z.ai/api/paas/v4";
            const apiUrl = `${endpoint}/chat/completions`;

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.config.model || "GLM-4.6",
                    messages: [{ role: "user", content: "test" }],
                    max_tokens: 5,
                }),
            });

            return response.ok;
        } catch {
            return false;
        }
    }
}
