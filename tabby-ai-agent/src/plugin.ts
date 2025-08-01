// plugin.ts - Main Tabby Plugin Entry Point
import { NgModule, Injectable } from '@angular/core'
import { ConfigProvider, HotkeysService, HostAppService } from 'tabby-core'
import { TerminalDecorator } from 'tabby-terminal'
import sanitizeHtml from 'sanitize-html'
import { AIAgentService } from './services/ai-agent.service'
import { MCPClientService } from './services/mcp-client.service'
import { ContextManagerService } from './services/context-manager.service'
import { AITerminalComponent } from './components/ai-terminal.component'
import { debug, LogLevel } from './utils/debug'

// Utility function for input sanitization
export function cleanInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  })
}

// Mode enumeration
export enum TerminalMode {
  SHELL = 'shell',
  AI = 'ai',
  SMART = 'smart'
}

@Injectable()
export class AIAgentTerminalDecorator extends TerminalDecorator {
  private currentMode: TerminalMode = TerminalMode.SMART
  private modeIndicator: string = ''

  constructor(
    private aiAgent: AIAgentService,
    private contextManager: ContextManagerService,
    private mcpClient: MCPClientService
  ) {
    super()
    this.initializeDebugLogging()
    this.updateModeIndicator()
    debug.info('AI Agent Terminal Decorator initialized')
  }

  private initializeDebugLogging(): void {
    debug.setLevel(LogLevel.INFO)
    debug.info('Debug logging initialized for AI Agent Terminal Decorator')
  }

  attach(terminal: any): void {
    // Override terminal input/output to intercept all commands
    const originalWrite = terminal.write.bind(terminal)
    const originalInput = terminal.onData.bind(terminal)

    // Intercept all terminal output
    terminal.write = (data: string) => {
      this.contextManager.addTerminalOutput(data)
      return originalWrite(data)
    }

    // Intercept all user input
    terminal.onData((data: string) => {
      this.handleUserInput(data, terminal)
    })
  }

  private async handleUserInput(input: string, terminal: any) {
    const cleanInput = input.trim()
    debug.debug('Handling user input', { input: cleanInput, mode: this.currentMode })
    
    // Check for mode switching commands first
    if (this.handleModeSwitch(cleanInput, terminal)) {
      debug.info('Mode switch detected')
      return
    }
    
    // Always add to context
    this.contextManager.addUserInput(cleanInput)
    
    // Handle based on current mode
    switch (this.currentMode) {
      case TerminalMode.SHELL:
        debug.debug('Processing in SHELL mode - executing as command')
        // Shell mode - always execute as command
        terminal.input(input)
        const shellOutput = await this.getCommandOutput(terminal)
        await this.aiAgent.observeCommand(cleanInput, shellOutput)
        break
        
      case TerminalMode.AI:
        debug.debug('Processing in AI mode')
        // AI mode - always treat as natural language
        if (cleanInput.length > 0) {
          debug.info('Processing natural language input with AI')
          await this.handleAIConversation(cleanInput, terminal)
        }
        break
        
      case TerminalMode.SMART:
      default:
        debug.debug('Processing in SMART mode')
        // Smart mode - auto-detect
        if (this.isCommand(cleanInput)) {
          debug.info('Command detected, executing as shell command')
          terminal.input(input)
          const smartOutput = await this.getCommandOutput(terminal)
          await this.aiAgent.observeCommand(cleanInput, smartOutput)
        } else if (cleanInput.length > 0) {
          debug.info('Natural language detected, processing with AI')
          await this.handleAIConversation(cleanInput, terminal)
        } else {
          debug.debug('Empty input, passing through to shell')
          terminal.input(input)
        }
        break
    }
  }

  private handleModeSwitch(input: string, terminal: any): boolean {
    // Check for mode switching escape sequences
    switch (input) {
      case '\\ai':
        this.setMode(TerminalMode.AI, terminal)
        return true
      case '\\shell':
        this.setMode(TerminalMode.SHELL, terminal)
        return true
      case '\\smart':
        this.setMode(TerminalMode.SMART, terminal)
        return true
      case '\\toggle':
        this.toggleMode(terminal)
        return true
      case '\\mode':
        this.showModeStatus(terminal)
        return true
      default:
        return false
    }
  }

  private setMode(mode: TerminalMode, terminal: any): void {
    this.currentMode = mode
    this.updateModeIndicator()
    terminal.write(`\r\n\x1b[33m[MODE] Switched to ${mode.toUpperCase()} mode${this.modeIndicator}\x1b[0m\r\n`)
  }

  private toggleMode(terminal: any): void {
    const modes = [TerminalMode.SMART, TerminalMode.AI, TerminalMode.SHELL]
    const currentIndex = modes.indexOf(this.currentMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    this.setMode(nextMode, terminal)
  }

  private showModeStatus(terminal: any): void {
    terminal.write(`\r\n\x1b[36m[STATUS] Current mode: ${this.currentMode.toUpperCase()}${this.modeIndicator}\x1b[0m\r\n`)
    terminal.write('\x1b[36mAvailable commands: \\ai, \\shell, \\smart, \\toggle, \\mode\x1b[0m\r\n')
  }

  private updateModeIndicator(): void {
    switch (this.currentMode) {
      case TerminalMode.AI:
        this.modeIndicator = ' 🤖'
        break
      case TerminalMode.SHELL:
        this.modeIndicator = ' 💻'
        break
      case TerminalMode.SMART:
      default:
        this.modeIndicator = ' 🧠'
        break
    }
  }

  private async getCommandOutput(terminal: any): Promise<string> {
    // Simple implementation - in a real scenario, you'd capture actual output
    return ''
  }

  private isCommand(input: string): boolean {
    // Liberal detection - anything that looks like a command
    const commandPatterns = [
      /^[a-zA-Z][a-zA-Z0-9_-]*(\s|$)/, // Standard commands (ls, cd, git, etc.)
      /^\.\//,  // Relative execution
      /^\//,    // Absolute paths
      /^\w+:/,  // Windows drives
      /^~/,     // Home directory
      /^\$/,    // Variable expansion
      /^\|/,    // Pipes
      /^>/,     // Redirects
    ]
    
    return commandPatterns.some(pattern => pattern.test(input))
  }

  private async handleAIConversation(input: string, terminal: any) {
    // Show user input in chat interface
    this.displayChatMessage('user', input, terminal)
    
    // Get context for AI
    const context = await this.contextManager.getFullContext()
    
    // Get available MCP tools
    const availableTools = await this.mcpClient.getAvailableTools()
    
    // Send to AI with context and tools
    const response = await this.aiAgent.processNaturalLanguage(
      input, 
      context, 
      availableTools
    )
    
    // Display AI response in blocks
    this.displayChatMessage('assistant', response, terminal)
  }

  private displayChatMessage(role: 'user' | 'assistant', content: string, terminal: any) {
    const timestamp = new Date().toLocaleTimeString()
    const roleColor = role === 'user' ? '\x1b[36m' : '\x1b[32m' // Cyan for user, Green for AI
    const resetColor = '\x1b[0m'
    
    terminal.write(`\r\n${roleColor}[${role.toUpperCase()} ${timestamp}]${resetColor}\r\n`)
    terminal.write(`${content}\r\n`)
    terminal.write('\r\n─────────────────────────────────────────\r\n')
  }
}

@NgModule({
  providers: [
    AIAgentService,
    MCPClientService,
    ContextManagerService,
    AIAgentTerminalDecorator
  ],
  declarations: [
    AITerminalComponent
  ]
})
class AIAgentPluginModule {}

export default {
  id: 'ai-agent',
  name: 'AI Agent',
  description: 'AI-powered terminal assistant with MCP integration',
  version: '1.0.0',
  configDefaults: {
    aiProvider: 'openai',
    mcpServers: []
  },
  providers: [
    AIAgentService,
    MCPClientService,
    ContextManagerService
  ]
}
