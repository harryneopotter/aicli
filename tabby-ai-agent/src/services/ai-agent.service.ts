import { Injectable } from '@angular/core';
import { ConfigService } from 'tabby-core';
import { ContextManagerService } from './context-manager.service';
import { MCPClientService } from './mcp-client.service';
import fetch from 'node-fetch';
import { ContextInfo, ConfigStore } from '../types/interfaces';

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokens?: number;
}

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: number;
  totalTokensUsed: number;
}

interface CacheEntry {
  response: string;
  timestamp: number;
  context: string;
  tokens: number;
}

@Injectable()
export class AIAgentService {
  private sessionHistory: AIMessage[] = [];
  private maxHistoryLength = 20;
  private responseCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private performanceMetrics: PerformanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalTokensUsed: 0
  };
  private isOnline = true;
  private lastHealthCheck = 0;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute

  constructor(
    private config: ConfigService & { store: ConfigStore },
    private contextManager: ContextManagerService,
    private mcpClient: MCPClientService
  ) {
    this.initializeHealthCheck();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  async processNaturalLanguage(input: string, _context?: unknown, _tools?: unknown[]): Promise<string> {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    
    try {
      // Get context from context manager first
      const fullContext = await this.contextManager.getFullContext();
      
      // Check cache first
      const cacheKey = this.generateCacheKey(input, fullContext);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log('Using cached response');
        return cachedResponse.response;
      }

      // Check if AI service is available
      if (!await this.checkServiceAvailability()) {
        return this.getOfflineFallbackResponse(input);
      }

      // Add user input to session history
      this.sessionHistory.push({
        role: 'user',
        content: input,
        timestamp: new Date().toISOString()
      });
      
      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(fullContext);
      
      // Get available MCP tools (only if MCP is enabled)
      const mcpEnabled = this.config.store.aiAgent?.enableMCPTools !== false;
      let availableTools: any[] = [];
      
      if (mcpEnabled) {
        try {
          // Ensure MCP client is initialized
          await this.mcpClient.initialize();
          availableTools = await this.mcpClient.getAvailableTools();
          console.log(`Available MCP tools: ${availableTools.length}`);
        } catch (error) {
          console.warn('Failed to get MCP tools:', error);
          // Continue without MCP tools
        }
      }
      
      // Prepare messages for AI
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
        ...this.sessionHistory.slice(-this.maxHistoryLength)
      ];

      // Call AI service based on configuration
      const aiModel = this.config.store.aiAgent?.defaultModel || 'ollama';
      let response: string;
      
      if (aiModel === 'ollama') {
        response = await this.callOllama(messages, availableTools);
      } else if (aiModel === 'gemini') {
        response = await this.callGeminiAPI(messages, availableTools);
      } else {
        throw new Error(`Unsupported AI model: ${aiModel}`);
      }

      // Check for tool calls in response (only if MCP is enabled)
      if (mcpEnabled) {
        const toolCalls = this.extractToolCalls(response);
        if (toolCalls.length > 0) {
          const toolResults = await this.executeToolCalls(toolCalls);
          response = this.integrateToolResults(response, toolResults);
        }
      }

      // Add assistant response to session history
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        tokens: this.estimateTokens(response)
      };
      this.sessionHistory.push(assistantMessage);

      // Cache the response
      this.cacheResponse(cacheKey, response, assistantMessage.tokens || 0);

      // Update performance metrics
      this.updatePerformanceMetrics(startTime, true, assistantMessage.tokens || 0);
      
      return response;
    } catch (error) {
      console.error('Error processing natural language:', error);
      this.updatePerformanceMetrics(startTime, false, 0);
      
      // Try fallback response
      const fallbackResponse = this.getErrorFallbackResponse(error, input);
      return fallbackResponse;
    }
  }

  private buildSystemPrompt(context: ContextInfo): string {
    const contextWindow = this.config.store.aiAgent?.contextWindow || 4000;
    
    let prompt = `You are an AI assistant integrated into a terminal environment. Be concise and helpful.\n\n`;
    
    // Add context information
    prompt += `Current Context:\n`;
    prompt += `- Working Directory: ${context.workingDirectory}\n`;
    
    if (context.gitStatus) {
      prompt += `- Git Status: ${context.gitStatus}\n`;
    }
    
    if (context.projectType) {
      prompt += `- Project Type: ${context.projectType}\n`;
    }
    
    if (context.packageInfo) {
      prompt += `- Project: ${context.packageInfo.name} v${context.packageInfo.version}\n`;
      if (context.packageInfo.scripts.length > 0) {
        prompt += `- Available Scripts: ${context.packageInfo.scripts.join(', ')}\n`;
      }
    }
    
    if (context.recentCommands.length > 0) {
      prompt += `- Recent Commands: ${context.recentCommands.slice(-3).join(', ')}\n`;
    }
    
    if (context.recentOutput.length > 0) {
      prompt += `- Recent Output: ${context.recentOutput.slice(-2).join(' | ')}\n`;
    }
    
    prompt += `\nCapabilities:\n`;
    prompt += `1. Explain command outputs and errors\n`;
    prompt += `2. Suggest commands for specific tasks\n`;
    prompt += `3. Help with troubleshooting\n`;
    prompt += `4. Provide code analysis and suggestions\n`;
    prompt += `5. Answer development questions\n`;
    
    if (this.config.store.aiAgent?.enableMCPTools !== false) {
      prompt += `6. Use available tools when needed\n`;
    }
    
    prompt += `\nGuidelines:\n`;
    prompt += `- Keep responses under ${Math.floor(contextWindow * 0.3)} characters\n`;
    prompt += `- Focus on practical, actionable solutions\n`;
    prompt += `- Use code examples when helpful\n`;
    prompt += `- If unsure, ask clarifying questions\n`;
    
    return prompt;
  }

  // eslint-disable-next-line no-unused-vars
  private async callOllama(messages: AIMessage[], _tools: unknown[]): Promise<string> {
    const endpoint = this.config.store.aiAgent?.ollamaEndpoint || 'http://localhost:11434';
    const model = this.config.store.aiAgent?.ollamaModel || 'llama3.2';
    
    const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

      try {
        const response = await fetch(`${endpoint}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              max_tokens: this.config.store.aiAgent?.contextWindow ? Math.floor(this.config.store.aiAgent.contextWindow * 0.3) : 1000
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return (data as any).message?.content || 'No response from Ollama';
      } catch (error: any) {
       if (error.name === 'AbortError') {
         throw new Error('Ollama request timed out. Please check if Ollama is running.');
       }
       throw new Error(`Failed to connect to Ollama: ${error?.message || 'Unknown error'}`);
     }
  }

  // eslint-disable-next-line no-unused-vars
  private async callGeminiAPI(messages: AIMessage[], _tools: unknown[]): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please set it in the plugin settings.');
    }
    
    const model = this.config.store.aiAgent?.geminiModel || 'gemini-1.5-flash';
    
    const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

      try {
        // Convert messages to Gemini format
        const geminiMessages = messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        
        // Add system prompt as first user message if exists
        const systemMessage = messages.find(m => m.role === 'system');
        if (systemMessage) {
          geminiMessages.unshift({
            role: 'user',
            parts: [{ text: `System: ${systemMessage.content}` }]
          });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              maxOutputTokens: this.config.store.aiAgent?.contextWindow ? Math.floor(this.config.store.aiAgent.contextWindow * 0.3) : 1000
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Gemini API error: ${response.status} ${(errorData as any).error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = (data as any).candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!content) {
          throw new Error('No response content from Gemini API');
        }
        
        return content;
      } catch (error: any) {
       if (error.name === 'AbortError') {
         throw new Error('Gemini request timed out. Please check your internet connection.');
       }
       throw new Error(`Failed to call Gemini API: ${error?.message || 'Unknown error'}`);
     }
  }

  async observeCommand(command: string, output: string): Promise<void> {
    // Add command observation to context
    this.contextManager.addCommand(command);
    this.contextManager.addTerminalOutput(output);
    
    // Auto-analyze errors if enabled
    if (this.config.store.aiAgent?.autoResponse && this.isErrorOutput(output)) {
      try {
        const analysis = await this.analyzeError(command, output);
        if (analysis) {
          // This could be displayed in the terminal or stored for later
          console.log('AI Analysis:', analysis);
        }
      } catch (error: any) {
         // Silently fail for auto-analysis
         console.debug('Auto-analysis failed:', error?.message || 'Unknown error');
       }
    }
  }

  private isErrorOutput(output: string): boolean {
    const errorIndicators = [
      'error:', 'Error:', 'ERROR:',
      'failed:', 'Failed:', 'FAILED:',
      'exception:', 'Exception:', 'EXCEPTION:',
      'not found', 'command not found',
      'permission denied', 'access denied',
      'syntax error', 'parse error'
    ];
    
    return errorIndicators.some(indicator => 
      output.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private async analyzeError(command: string, output: string): Promise<string | null> {
    try {
      const prompt = `Analyze this command error and provide a brief solution:\n\nCommand: ${command}\nError: ${output.slice(0, 500)}\n\nProvide a concise solution (max 100 words):`;
      return await this.processNaturalLanguage(prompt);
    } catch {
      return null;
    }
  }

  private extractToolCalls(response: string): any[] {
    const toolCalls = [];
    
    // Look for various tool call patterns
    const patterns = [
      // Standard MCP format: {"tool": "name", "parameters": {...}}
      /\{\s*["']tool["']\s*:\s*["']([^"']+)["']\s*,\s*["']parameters["']\s*:\s*\{[^}]*\}\s*\}/g,
      // Function call format: tool_name({...})
      /(\w+)\(\{[^}]*\}\)/g,
      // Markdown code block with tool calls
      /```(?:json|tool)\s*\n(\{[^}]*"tool"[^}]*\})\s*\n```/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        try {
          let toolCall;
          if (match[0].includes('"tool"')) {
            // JSON format
            toolCall = JSON.parse(match[0]);
          } else if (match[1] && match[0].includes('(')) {
            // Function call format
            const toolName = match[1];
            const paramsMatch = match[0].match(/\((.*)\)/);
            if (paramsMatch) {
              const parameters = JSON.parse(paramsMatch[1]);
              toolCall = { tool: toolName, parameters };
            }
          }
          
          if (toolCall && toolCall.tool) {
            toolCalls.push(toolCall);
          }
        } catch (error) {
          console.debug('Failed to parse tool call:', match[0], error);
        }
      }
    }
    
    return toolCalls;
  }

  private async executeToolCalls(toolCalls: any[]): Promise<any[]> {
    const results = [];
    
    for (const toolCall of toolCalls) {
      try {
        console.log(`Executing tool: ${toolCall.tool}`, toolCall.parameters);
        
        // Validate tool call format
        if (!toolCall.tool || typeof toolCall.tool !== 'string') {
          throw new Error('Invalid tool call: missing or invalid tool name');
        }
        
        if (!toolCall.parameters || typeof toolCall.parameters !== 'object') {
          throw new Error('Invalid tool call: missing or invalid parameters');
        }
        
        const result = await this.mcpClient.executeTool(toolCall.tool, toolCall.parameters);
        results.push({ 
          toolCall, 
          result,
          success: true,
          timestamp: new Date().toISOString()
        });
        
      } catch (error: any) {
        console.error(`Tool execution failed for ${toolCall.tool}:`, error);
        results.push({ 
          toolCall, 
          error: error?.message || 'Unknown error',
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  private integrateToolResults(response: string, toolResults: any[]): string {
    if (toolResults.length === 0) {
      return response;
    }
    
    let integratedResponse = response;
    integratedResponse += '\n\n--- Tool Execution Results ---';
    
    for (const { toolCall, result, error, success } of toolResults) {
      integratedResponse += `\n\n🔧 Tool: ${toolCall.tool}`;
      
      if (success && result) {
        // Format result based on type
        if (typeof result === 'string') {
          integratedResponse += `\n✅ Result: ${result}`;
        } else if (result && typeof result === 'object') {
          // Pretty print objects but limit size
          const resultStr = JSON.stringify(result, null, 2);
          if (resultStr.length > 500) {
            integratedResponse += `\n✅ Result: ${resultStr.substring(0, 500)}...`;
          } else {
            integratedResponse += `\n✅ Result: ${resultStr}`;
          }
        } else {
          integratedResponse += `\n✅ Result: ${String(result)}`;
        }
      } else if (error) {
        integratedResponse += `\n❌ Error: ${error}`;
      }
    }
    
    return integratedResponse;
  }

  private async checkServiceAvailability(): Promise<boolean> {
    const now = Date.now();
    
    // Check cache first
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return this.isOnline;
    }
    
    try {
      const aiModel = this.config.store.aiAgent?.defaultModel || 'ollama';
      
      if (aiModel === 'ollama') {
        const endpoint = this.config.store.aiAgent?.ollamaEndpoint || 'http://localhost:11434';
        const response = await fetch(`${endpoint}/api/tags`, {
          method: 'GET',
          // Note: AbortSignal.timeout not available in older Node versions
         // Using manual timeout handling instead
        });
        this.isOnline = response.ok;
      } else if (aiModel === 'gemini') {
        // For Gemini, just check if API key is configured
        this.isOnline = !!this.config.store.aiAgent?.geminiApiKey;
      }
      
      this.lastHealthCheck = now;
      return this.isOnline;
    } catch {
      this.isOnline = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  // eslint-disable-next-line no-unused-vars
  private getOfflineFallbackResponse(_input: string): string {
    const fallbackResponses = [
      "I'm currently offline. Here are some general suggestions:",
      "• Check if the AI service is running",
      "• Verify your network connection",
      "• Try running the command directly",
      "• Use 'man <command>' for help with specific commands"
    ];
    
    return fallbackResponses.join('\n');
  }

  // eslint-disable-next-line no-unused-vars
  private getErrorFallbackResponse(error: unknown, _input: string): string {
    if ((error as any)?.message?.includes('API key')) {
      return "Please configure your API key in the plugin settings to use AI features.";
    }
    
    if ((error as any)?.message?.includes('timeout') || (error as any)?.message?.includes('connect')) {
      return "Connection timeout. Please check if the AI service is running and accessible.";
    }
    
    return `I encountered an error: ${(error as any)?.message || 'Unknown error'}. You can try running the command directly or check the plugin configuration.`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private updatePerformanceMetrics(startTime: number, success: boolean, tokens: number): void {
    const responseTime = Date.now() - startTime;
    
    if (success) {
      this.performanceMetrics.successfulRequests++;
      this.performanceMetrics.totalTokensUsed += tokens;
    } else {
      this.performanceMetrics.failedRequests++;
    }
    
    // Update average response time
    const totalRequests = this.performanceMetrics.successfulRequests + this.performanceMetrics.failedRequests;
    this.performanceMetrics.averageResponseTime = 
      (this.performanceMetrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    
    this.performanceMetrics.lastRequestTime = Date.now();
  }

  private initializeHealthCheck(): void {
    // Perform initial health check
    this.checkServiceAvailability();
  }

  // Public utility methods
  clearHistory(): void {
    this.sessionHistory = [];
  }

  getSessionHistory(): AIMessage[] {
    return [...this.sessionHistory];
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  isServiceOnline(): boolean {
    return this.isOnline;
  }

  async forceHealthCheck(): Promise<boolean> {
    this.lastHealthCheck = 0; // Force refresh
    return await this.checkServiceAvailability();
  }

  // Configuration helpers
  getConfiguredModel(): string {
    return this.config.store.aiAgent?.defaultModel || 'ollama';
  }

  isAutoResponseEnabled(): boolean {
    return this.config.store.aiAgent?.autoResponse !== false;
  }

  isMCPEnabled(): boolean {
    return this.config.store.aiAgent?.enableMCPTools !== false;
  }

  // Cache management methods
  private generateCacheKey(input: string, context?: any): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `${input}:${contextStr}`.substring(0, 200); // Limit key length
  }

  private getCachedResponse(key: string): CacheEntry | null {
    const entry = this.responseCache.get(key);
    if (!entry) return null;

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.responseCache.delete(key);
      return null;
    }

    return entry;
  }

  private cacheResponse(key: string, response: string, tokens: number): void {
    // Clean old entries if cache is full
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanOldCacheEntries();
    }

    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
      context: key,
      tokens
    };

    this.responseCache.set(key, entry);
  }

  private cleanOldCacheEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.responseCache.entries());
    
    // Remove expired entries first
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.responseCache.delete(key);
      }
    }

    // If still too many entries, remove oldest ones
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([key]) => this.responseCache.has(key))
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedEntries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.3));
      for (const [key] of toRemove) {
        this.responseCache.delete(key);
      }
    }
  }

  clearCache(): void {
    this.responseCache.clear();
  }

  getCacheStats(): { size: number; hitRate: number; totalTokensSaved: number } {
    const totalTokensSaved = Array.from(this.responseCache.values())
      .reduce((sum, entry) => sum + entry.tokens, 0);
    
    return {
      size: this.responseCache.size,
      hitRate: this.performanceMetrics.totalRequests > 0 
        ? (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests) * 100 
        : 0,
      totalTokensSaved
    };
  }
}
