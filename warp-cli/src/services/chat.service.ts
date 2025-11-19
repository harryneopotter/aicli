import { Message, LLMConfig, LLMProvider } from "../types";
import { providerFactory } from "../providers";
import { sessionService } from "./session.service";
import { contextService } from "./context.service";
import { configService } from "./config.service";
import { uiRenderer } from "../ui/renderer";
import { agentService } from "./agent.service";

export class ChatService {
  private currentProvider?: LLMProvider;

  async initialize(): Promise<void> {
    await this.switchProvider(configService.get("defaultProvider"));
  }

  async switchProvider(
    providerName: "ollama" | "openai" | "anthropic" | "gemini",
  ): Promise<void> {
    const providerConfig = configService.getProviderConfig(providerName);

    if (!providerConfig) {
      const defaultConfig: any = {
        ollama: {
          endpoint: "http://localhost:11434",
          model: "openhermes:7b-mistral-v2.5-q4_K_M",
        },
        openai: { model: "gpt-4" },
        anthropic: { model: "claude-3-sonnet" },
        gemini: { model: "gemini-1.5-flash" },
      };

      configService.setProviderConfig(
        providerName,
        defaultConfig[providerName],
      );
    }

    const config: LLMConfig = {
      provider: providerName,
      model: (providerConfig as any).model,
      apiKey: (providerConfig as any).apiKey,
      endpoint: (providerConfig as any).endpoint,
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9,
    };

    this.currentProvider = await providerFactory.getProvider(config);

    if (!this.currentProvider) {
      throw new Error(`Failed to initialize ${providerName} provider`);
    }

    const isAvailable = await this.currentProvider.isAvailable();
    if (!isAvailable) {
      throw new Error(
        `Provider ${providerName} is not available. Please check your configuration.`,
      );
    }
  }

  async switchProviderWithFallback(
    providerName: "ollama" | "openai" | "anthropic" | "gemini",
  ): Promise<void> {
    const fallbackProviders = [
      "ollama",
      "openai",
      "anthropic",
      "gemini",
    ] as const;
    const startIndex = fallbackProviders.indexOf(providerName);
    const orderedProviders = [
      ...fallbackProviders.slice(startIndex),
      ...fallbackProviders.slice(0, startIndex),
    ];

    for (const provider of orderedProviders) {
      try {
        await this.switchProvider(provider);
        if (provider !== providerName) {
          uiRenderer.renderInfo(`Fallback to ${provider} provider`);
        }
        return;
      } catch (error) {
        uiRenderer.renderWarning(
          `Provider ${provider} failed: ${(error as Error).message}`,
        );
        continue;
      }
    }

    throw new Error("All providers failed. Please check your configurations.");
  }

  async chat(
    userMessage: string,
    options?: { streaming?: boolean },
  ): Promise<string> {
    if (!this.currentProvider) {
      throw new Error("No provider initialized");
    }

    const session = sessionService.getCurrentSession();
    if (!session) {
      throw new Error("No active session");
    }

    const userMsg = sessionService.addMessage("user", userMessage);
    uiRenderer.renderMessage(userMsg);

    const context = await contextService.getContext();
    const agent = agentService.getCurrentAgent();
    const systemPrompt = contextService.buildSystemPrompt(
      context,
      agent?.content,
    );

    const messages: Message[] = [
      {
        id: "system",
        role: "system",
        content: systemPrompt,
        timestamp: new Date(),
      },
      ...sessionService.getLastNMessages(
        configService.get("context").maxHistory,
      ),
    ];

    try {
      let response = "";

      if (options?.streaming && this.currentProvider.streamChat) {
        uiRenderer.startStreamingResponse();
        const chunks: string[] = [];

        for await (const chunk of this.currentProvider.streamChat(messages)) {
          chunks.push(chunk);
          uiRenderer.renderStreamingChunk(chunk);
        }

        uiRenderer.endStreamingResponse();
        response = chunks.join("");
      } else {
        uiRenderer.renderLoading("Thinking...");
        response = await this.currentProvider.chat(messages);
        uiRenderer.stopLoading();
      }

      const assistantMsg = sessionService.addMessage("assistant", response, {
        provider: this.currentProvider.name,
        model: configService.get("defaultProvider"),
        agent: agent?.name,
      });

      if (!options?.streaming) {
        uiRenderer.renderMessage(assistantMsg);
      }

      return response;
    } catch (error: any) {
      uiRenderer.stopLoading();
      throw new Error(`Chat error: ${(error as Error).message}`);
    }
  }

  async executeCommand(command: string): Promise<void> {
    uiRenderer.renderLoading(`Executing: ${command}`);

    try {
      const result = await contextService.executeCommand(command);
      uiRenderer.stopLoading();

      if (result.error) {
        uiRenderer.renderWarning("Command completed with warnings");
      }

      uiRenderer.renderCodeBlock(result.output, "shell");

      sessionService.addMessage(
        "system",
        `Command: ${command}\n\nOutput:\n${result.output}`,
        {
          type: "command_execution",
          command,
          output: result.output,
          error: result.error,
        },
      );
    } catch (error: any) {
      uiRenderer.stopLoading();
      uiRenderer.renderError(
        `Command execution failed: ${(error as Error).message}`,
      );
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
    return this.currentProvider?.name || "none";
  }

  async checkProviderStatus(): Promise<{
    provider: string;
    available: boolean;
    error?: string;
  }> {
    if (!this.currentProvider) {
      return {
        provider: "none",
        available: false,
        error: "No provider initialized",
      };
    }

    try {
      const available = await this.currentProvider.isAvailable();
      return {
        provider: this.currentProvider.name,
        available,
      };
    } catch (error: any) {
      return {
        provider: this.currentProvider.name,
        available: false,
        error: (error as Error).message,
      };
    }
  }
}

export const chatService = new ChatService();
