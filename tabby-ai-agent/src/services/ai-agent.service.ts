import { Injectable } from '@angular/core'
import { ConfigProvider } from 'tabby-core'
import { MCPClientService } from './mcp-client.service'
import { ContextManagerService } from './context-manager.service'

@Injectable()
export class AIAgentService {
  private currentModel: 'gemma3' | 'gemini-api' = 'gemma3'
  private sessionHistory: Array<{role: string, content: string, timestamp: Date}> = []

  constructor(
    private config: ConfigProvider,
    private mcpClient: MCPClientService,
    private contextManager: ContextManagerService
  ) {}

  async processNaturalLanguage(
    input: string, 
    context: any, 
    availableTools: any[]
  ): Promise<string> {
    // Add to session history
    this.sessionHistory.push({
      role: 'user',
      content: input,
      timestamp: new Date()
    })

    // Prepare context-aware prompt
    const systemPrompt = this.buildSystemPrompt(context, availableTools)
    const messages = this.buildMessageHistory(input)

    let response: string

    try {
      if (this.currentModel === 'gemma3') {
        response = await this.callOllama(systemPrompt, messages)
      } else {
        response = await this.callGeminiAPI(systemPrompt, messages)
      }

      // Check if AI wants to use MCP tools
      const toolCalls = this.extractToolCalls(response)
      if (toolCalls.length > 0) {
        const toolResults = await this.executeMCPTools(toolCalls)
        response = await this.integrateToolResults(response, toolResults)
      }

      // Add AI response to history
      this.sessionHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      })

      return response

    } catch (error) {
      return `Error: ${error.message}`
    }
  }

  private buildSystemPrompt(context: any, availableTools: any[]): string {
    return `You are an AI assistant integrated into a terminal environment. You have access to:

CURRENT CONTEXT:
- Working Directory: ${context.workingDirectory}
- Git Status: ${context.gitStatus || 'Not a git repository'}
- Recent Commands: ${context.recentCommands.slice(-5).join(', ')}
- Project Type: ${context.projectType || 'Unknown'}
- Active Files: ${context.activeFiles?.join(', ') || 'None'}

AVAILABLE MCP TOOLS:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

MEMORY FROM THIS SESSION:
${this.getRecentMemory()}

Guidelines:
- Be concise and helpful
- Suggest commands when appropriate
- Use MCP tools to read files, check git status, etc. when needed
- Remember context from our conversation
- For coding questions, consider the current project context
- Always be aware you're in a terminal environment`
  }

  private buildMessageHistory(currentInput: string) {
    // Keep last 10 exchanges to manage token usage
    const recentHistory = this.sessionHistory.slice(-20)
    return [
      ...recentHistory.map(h => ({role: h.role, content: h.content})),
      {role: 'user', content: currentInput}
    ]
  }

  private async callOllama(systemPrompt: string, messages: any[]): Promise<string> {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: 'gemma2:2b',
        messages: [
          {role: 'system', content: systemPrompt},
          ...messages
        ],
        stream: false
      })
    })
    
    const data = await response.json()
    return data.message.content
  }

  private async callGeminiAPI(systemPrompt: string, messages: any[]): Promise<string> {
    // Implement Gemini API call
    // This would use your existing gemini-cli or direct API
    const apiKey = this.config.store.aiAgent?.geminiApiKey
    // Implementation depends on your preferred method
    return "Gemini API response here"
  }

  async observeCommand(command: string): Promise<void> {
    // AI observes command execution for context
    this.contextManager.addCommand(command)
    
    // Could provide helpful suggestions after certain commands
    if (command.startsWith('git') || command.includes('error')) {
      // Maybe offer help contextually
    }
  }

  private getRecentMemory(): string {
    return this.sessionHistory
      .slice(-6)
      .map(h => `${h.role}: ${h.content}`)
      .join('\n')
  }

  // MCP Tool integration methods
  private extractToolCalls(response: string): any[] {
    // Parse AI response for tool call requests
    // This would look for specific patterns or structured requests
    return []
  }

  private async executeMCPTools(toolCalls: any[]): Promise<any[]> {
    const results = []
    for (const call of toolCalls) {
      const result = await this.mcpClient.executeTool(call.name, call.parameters)
      results.push(result)
    }
    return results
  }

  private async integrateToolResults(originalResponse: string, toolResults: any[]): Promise<string> {
    // Integrate tool results back into the response
    return originalResponse // For now
  }

  switchModel(model: 'gemma3' | 'gemini-api'): void {
    this.currentModel = model
  }
}
