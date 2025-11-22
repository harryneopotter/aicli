import { Message, LLMConfig, LLMProvider } from "../types";
import { providerFactory } from "../providers";
import { sessionService } from "./session.service";
import { contextService } from "./context.service";
import { configService } from "./config.service";
import { uiRenderer } from "../ui/renderer";
import { agentService } from "./agent.service";
import { toolService } from "./tool.service";
import { mcpService } from "./mcp.service";
import { Tokenizer } from "../utils/tokenizer";

export class ChatService {
  private currentProvider?: LLMProvider;

  async initialize(): Promise<void> {
    await this.switchProvider(configService.get("defaultProvider"));
  }

  async switchProvider(
    providerName: "ollama" | "openai" | "anthropic" | "gemini" | "glm",
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
        glm: {
          model: "GLM-4.6",
          endpoint: "https://api.z.ai/api/paas/v4"
        },
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

    // Auto-connect GLM MCP servers
    if (providerName === 'glm') {
      try {
        const glmConfig = await configService.getProviderConfig('glm');
        if (glmConfig?.apiKey) {
          await mcpService.connectGLMMCPServers(glmConfig.apiKey);
          await toolService.registerMCPTools(['zai-vision', 'zai-web-search', 'zai-web-reader']);
          uiRenderer.renderSuccess('\u2713 Connected to GLM MCP servers (Vision, Web Search, Web Reader)');
        }
      } catch (error) {
        uiRenderer.renderWarning(`Failed to connect GLM MCP servers: ${(error as Error).message}`);
      }
    } else {
      // Disconnect GLM servers when switching away
      try {
        await mcpService.disconnectGLMMCPServers();
      } catch {
        // Ignore errors during disconnect
      }
    }
  }

  async switchProviderWithFallback(
    providerName: "ollama" | "openai" | "anthropic" | "gemini" | "glm",
  ): Promise<void> {
    const fallbackProviders = [
      "ollama",
      "openai",
      "anthropic",
      "gemini",
      "glm",
    ] as const;
    const startIndex = fallbackProviders.indexOf(providerName);
    const orderedProviders = [
      ...fallbackProviders.slice(startIndex),
      ...fallbackProviders.slice(0, startIndex),
    ];

    for (const provider of orderedProviders) {
      try {
        await this.switchProvider(provider as "ollama" | "openai" | "anthropic" | "gemini" | "glm");
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
    const toolsInfo = toolService.getSystemPromptAddition();
    const systemPrompt = contextService.buildSystemPrompt(
      context,
      agent?.content,
      toolsInfo
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

    const maxTokens = configService.get("context").maxContextTokens || 16000;
    const optimizedMessages = Tokenizer.optimizeContext(messages, maxTokens);

    try {
      let response = "";
      let steps = 0;
      const maxSteps = 5;

      while (steps < maxSteps) {
        steps++;

        if (options?.streaming && this.currentProvider.streamChat) {
          uiRenderer.startStreamingResponse();
          const chunks: string[] = [];

          for await (const chunk of this.currentProvider.streamChat(optimizedMessages)) {
            chunks.push(chunk);
            uiRenderer.renderStreamingChunk(chunk);
          }

          uiRenderer.endStreamingResponse();
          response = chunks.join("");
        } else {
          uiRenderer.renderLoading(steps === 1 ? "Thinking..." : "Analyzing tool output...");
          response = await this.currentProvider.chat(optimizedMessages);
          uiRenderer.stopLoading();
        }

        // Check for tool call
        const toolCall = toolService.parseToolCall(response);
        if (toolCall) {
          const toolName = toolCall.name;
          const toolArgs = toolCall.args;
          const tool = toolService.getTool(toolName);

          // Render the tool call to the user (so they see what's happening)
          if (!options?.streaming) {
            // If not streaming, we haven't shown the "TOOL: ..." response yet.
            // But we probably don't want to show the raw protocol to the user as a chat message?
            // Actually, showing it is good for transparency.
            // Let's add it to session history first.
          }

          // Add assistant's thought/tool call to history
          sessionService.addMessage("assistant", response, {
            provider: this.currentProvider.name,
            model: configService.get("defaultProvider"),
            agent: agent?.name,
            toolCall: { name: toolName, args: toolArgs }
          });
          messages.push({ role: "assistant", content: response, id: "temp_assistant", timestamp: new Date() });

          if (tool) {
            uiRenderer.renderInfo(`Agent calling tool: ${toolName}`);
            const output = await tool.execute(toolArgs);

            // Add system output to history
            const systemMsg = `TOOL OUTPUT: ${output}`;
            sessionService.addMessage("system", systemMsg, { type: "tool_output" });
            messages.push({ role: "system", content: systemMsg, id: "temp_system", timestamp: new Date() });

            // Loop continues to let agent react to output
            continue;
          } else {
            const errorMsg = `TOOL OUTPUT: Error: Tool '${toolName}' not found.`;
            sessionService.addMessage("system", errorMsg, { type: "tool_output_error" });
            messages.push({ role: "system", content: errorMsg, id: "temp_system", timestamp: new Date() });
            continue;
          }
        }

        // No tool call, this is the final response
        const assistantMsg = sessionService.addMessage("assistant", response, {
          provider: this.currentProvider.name,
          model: configService.get("defaultProvider"),
          agent: agent?.name,
        });

        if (!options?.streaming) {
          uiRenderer.renderMessage(assistantMsg);
        }

        return response;
      }

      return response; // Max steps reached
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
  async getEmbedding(text: string): Promise<number[]> {
    if (!this.currentProvider) {
      throw new Error("No provider initialized");
    }
    if (!this.currentProvider.embed) {
      throw new Error(`Provider ${this.currentProvider.name} does not support embeddings`);
    }
    return await this.currentProvider.embed(text);
  }
}

export const chatService = new ChatService();
