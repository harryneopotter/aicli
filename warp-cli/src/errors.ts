// Structured error hierarchy for warp-cli
export class AICliError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AICliError';
  }
}

export class CommandExecutionError extends AICliError {
  constructor(message: string, details?: unknown) {
    super('COMMAND_EXECUTION', message, details);
    this.name = 'CommandExecutionError';
  }
}

export class ProviderError extends AICliError {
  constructor(message: string, details?: unknown) {
    super('PROVIDER', message, details);
    this.name = 'ProviderError';
  }
}
