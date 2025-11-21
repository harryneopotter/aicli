// Core Types for Warp CLI

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface ToolCall {
  name: string;
  args: Record<string, JsonValue>;
}

export interface ChatOptions {
  streaming?: boolean;
  model?: string;
  temperature?: number;
}

export interface ProviderConfig {
  model: string;
  apiKey?: string;
  endpoint?: string;
  temperature?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  tokens?: number;
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  name: string;
  created: Date;
  updated: Date;
  messages: Message[];
  context: SessionContext;
  metadata?: Record<string, unknown>;
}

export interface SessionContext {
  workingDirectory: string;
  gitBranch?: string;
  gitStatus?: string;
  projectType?: string;
  recentCommands: string[];
  environment: Record<string, string>;
  files?: string[];
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

export type ProviderName = "ollama" | "openai" | "anthropic" | "gemini";

export interface Config {
  defaultProvider: "ollama" | "openai" | "anthropic" | "gemini";
  providers: {
    ollama?: {
      endpoint: string;
      model: string;
    };
    openai?: {
      apiKey: string;
      model: string;
    };
    anthropic?: {
      apiKey: string;
      model: string;
    };
    gemini?: {
      apiKey: string;
      model: string;
    };
  };
  ui: {
    theme: string;
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
  streamChat?(
    messages: Message[],
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<string>;
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
