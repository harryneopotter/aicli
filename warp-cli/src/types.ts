// Core Types for Warp CLI

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  metadata?: Record<string, any>;
}

export interface Session {
  id: string;
  name: string;
  created: Date;
  updated: Date;
  messages: Message[];
  context: SessionContext;
  metadata?: Record<string, any>;
}

export interface SessionContext {
  workingDirectory: string;
  gitBranch?: string;
  gitStatus?: string;
  projectType?: string;
  recentCommands: string[];
  environment: Record<string, string>;
  files?: ContextFileAttachment[];
}

export interface ContextFileAttachment {
  path: string;
  size: number;
  preview: string;
  updated: string;
}

export type ProviderName = 'ollama' | 'openai' | 'anthropic' | 'gemini';

export interface ProviderSettings {
  model?: string;
  endpoint?: string;
  apiKey?: string;
}

export interface LLMConfig {
  provider: ProviderName;
  model: string;
  apiKey?: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface Config {
  defaultProvider: ProviderName;
  providers: Partial<Record<ProviderName, ProviderSettings>>;
  ui: {
    theme: 'dark' | 'light';
    markdown: boolean;
    streaming: boolean;
  };
  context: {
    maxHistory: number;
    includeGit: boolean;
    includeFiles: boolean;
    autoContext: boolean;
  };
  session: {
    autosave: boolean;
    directory: string;
  };
}

export interface LLMProvider {
  name: string;
  initialize(config: LLMConfig): Promise<void>;
  chat(messages: Message[], config?: Partial<LLMConfig>): Promise<string>;
  streamChat?(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string>;
  isAvailable(): Promise<boolean>;
}

export interface ContextData {
  cwd: string;
  git?: {
    branch: string;
    status: string;
    remotes: string[];
  };
  project?: {
    type: string;
    name: string;
    version: string;
    scripts?: string[];
  };
  system: {
    os: string;
    platform: string;
    shell: string;
  };
  history: {
    commands: string[];
    outputs: string[];
  };
  files?: ContextFileAttachment[];
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

export interface StorageProvider {
  initialize(): Promise<void>;
  saveSession(session: Session): Promise<void>;
  loadSession(id: string): Promise<Session | null>;
  listSessions(): Promise<Session[]>;
  deleteSession(id: string): Promise<void>;
  searchSessions(query: string): Promise<Session[]>;
}

export interface PluginRunResult {
  output?: string;
  highlights?: string[];
  metadata?: Record<string, any>;
}

export interface WarpPlugin {
  name: string;
  description: string;
  version?: string;
  author?: string;
  run(args: string[], context: ContextData): Promise<PluginRunResult | string> | PluginRunResult | string;
}

export interface PluginSummary {
  name: string;
  description: string;
  version?: string;
  source: 'builtin' | 'external';
}

export interface UIRenderer {
  renderWelcome(): void;
  renderPrompt(mode: string): void;
  renderMessage(message: Message): void;
  renderError(error: string): void;
  renderLoading(text: string): void;
  renderTable(headers: string[], rows: string[][]): void;
  renderBox(title: string, content: string): void;
  clear(): void;
}
