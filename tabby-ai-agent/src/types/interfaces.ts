// TypeScript interfaces for better type safety

export interface ContextInfo {
  workingDirectory: string;
  gitStatus?: string | null;
  projectType?: string | null;
  packageInfo?: PackageInfo | null;
  recentCommands: string[];
  recentOutput: string[];
  recentInputs: string[];
  activeFiles: string[];
  cacheAge: number;
}

export interface PackageInfo {
  name: string;
  version: string;
  scripts: string[];
  dependencies: string[];
  devDependencies: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverName: string;
}

export interface ToolCallResult {
  toolCall: {
    tool: string;
    parameters: Record<string, unknown>;
  };
  result?: unknown;
  error?: string;
  success: boolean;
  timestamp: string;
}

export interface OllamaResponse {
  message?: {
    content: string;
  };
  model?: string;
  done?: boolean;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

export interface ConfigStore {
  aiAgent?: {
    defaultModel?: string;
    ollamaEndpoint?: string;
    ollamaModel?: string;
    geminiModel?: string;
    geminiApiKey?: string;
    autoResponse?: boolean;
    contextWindow?: number;
    enableMCPTools?: boolean;
    tokenOptimization?: {
      compressContext?: boolean;
      maxFileSize?: number;
      smartTruncation?: boolean;
    };
  };
}

export interface DebugContext {
  input?: string;
  mode?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ErrorContext {
  message: string;
  stack?: string;
  code?: string;
  details?: Record<string, unknown>;
}