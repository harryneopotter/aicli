export class MCPerror extends Error {
  readonly isMCPerror = true;
  constructor(message: string) {
    super(`[MCP] ${message}`);
  }
}

export class AIServiceError extends Error {
  readonly isAIServiceError = true;
  constructor(message: string, public provider: string) {
    super(`[AI-${provider}] ${message}`);
    this.name = 'AIServiceError';
  }
}

export class ContextError extends Error {
  readonly isContextError = true;
  constructor(message: string) {
    super(`[Context] ${message}`);
    this.name = 'ContextError';
  }
}

export class ConfigurationError extends Error {
  readonly isConfigurationError = true;
  constructor(message: string) {
    super(`[Config] ${message}`);
    this.name = 'ConfigurationError';
  }
}

export class TerminalError extends Error {
  readonly isTerminalError = true;
  constructor(message: string) {
    super(`[Terminal] ${message}`);
    this.name = 'TerminalError';
  }
}

export class PluginError extends Error {
  readonly isPluginError = true;
  constructor(message: string) {
    super(`[Plugin] ${message}`);
    this.name = 'PluginError';
  }
}