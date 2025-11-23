/**
 * Error handling utilities with sanitization
 */

export enum ErrorCode {
  // Authentication errors (1xxx)
  AUTH_INVALID_API_KEY = 'AUTH_1001',
  AUTH_MISSING_API_KEY = 'AUTH_1002',
  AUTH_KEYCHAIN_ACCESS_DENIED = 'AUTH_1003',

  // Provider errors (2xxx)
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_2001',
  PROVIDER_RATE_LIMIT = 'PROVIDER_2002',
  PROVIDER_NETWORK_ERROR = 'PROVIDER_2003',
  PROVIDER_INVALID_RESPONSE = 'PROVIDER_2004',

  // Session errors (3xxx)
  SESSION_NOT_FOUND = 'SESSION_3001',
  SESSION_LOAD_FAILED = 'SESSION_3002',
  SESSION_SAVE_FAILED = 'SESSION_3003',
  SESSION_DECRYPT_FAILED = 'SESSION_3004',

  // Command errors (4xxx)
  COMMAND_NOT_ALLOWED = 'COMMAND_4001',
  COMMAND_INJECTION_BLOCKED = 'COMMAND_4002',
  COMMAND_EXECUTION_FAILED = 'COMMAND_4003',
  COMMAND_TIMEOUT = 'COMMAND_4004',

  // File errors (5xxx)
  FILE_NOT_FOUND = 'FILE_5001',
  FILE_ACCESS_DENIED = 'FILE_5002',
  FILE_PATH_TRAVERSAL = 'FILE_5003',

  // Tool errors (6xxx)
  TOOL_NOT_FOUND = 'TOOL_6001',
  TOOL_INVALID_ARGS = 'TOOL_6002',
  TOOL_EXECUTION_FAILED = 'TOOL_6003',

  // System errors (9xxx)
  UNKNOWN_ERROR = 'SYSTEM_9999',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  helpText?: string;
  details?: Record<string, any>;
  originalError?: Error;
}

export class ErrorHandler {
  // Patterns to sanitize from error messages
  private static readonly SENSITIVE_PATTERNS = [
    // API keys
    /sk-[a-zA-Z0-9]{32,}/g,
    /sk-ant-[a-zA-Z0-9-]+/g,
    /AIza[a-zA-Z0-9_-]{35}/g, // Gemini
    /glm-[a-zA-Z0-9]+/g, // GLM

    // File paths (partial)
    /\/home\/[^\/\s]+/g,
    /\/Users\/[^\/\s]+/g,
    /C:\\Users\\[^\\s]+/g,

    // IP addresses
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

    // Passwords (common patterns)
    /password[=:]\s*["']?[^"'\s]+["']?/gi,
    /api[_-]?key[=:]\s*["']?[^"'\s]+["']?/gi,
  ];

  /**
   * Create a standardized error object
   */
  static createError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    helpText?: string,
    originalError?: Error
  ): AppError {
    return {
      code,
      message: this.sanitizeMessage(message),
      userMessage: this.sanitizeMessage(userMessage),
      helpText,
      originalError,
    };
  }

  /**
   * Sanitize error message to remove sensitive data
   */
  static sanitizeMessage(message: string): string {
    let sanitized = message;

    // Replace sensitive patterns
    for (const pattern of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '***REDACTED***');
    }

    return sanitized;
  }

  /**
   * Convert unknown error to AppError
   */
  static fromUnknown(error: unknown, context?: string): AppError {
    if (error instanceof Error) {
      return this.fromError(error, context);
    }

    if (typeof error === 'string') {
      return this.createError(
        ErrorCode.UNKNOWN_ERROR,
        error,
        'An unexpected error occurred',
        'Please try again or contact support'
      );
    }

    return this.createError(
      ErrorCode.UNKNOWN_ERROR,
      String(error),
      'An unexpected error occurred',
      'Please try again or contact support'
    );
  }

  /**
   * Convert Error object to AppError
   */
  static fromError(error: Error, context?: string): AppError {
    // Check for known error patterns
    const message = error.message.toLowerCase();

    if (message.includes('api key') || message.includes('unauthorized')) {
      return this.createError(
        ErrorCode.AUTH_INVALID_API_KEY,
        error.message,
        'Invalid or missing API key',
        'Run /provider <name> to set up your API key',
        error
      );
    }

    if (message.includes('rate limit')) {
      return this.createError(
        ErrorCode.PROVIDER_RATE_LIMIT,
        error.message,
        'Rate limit exceeded',
        'Please wait a moment before trying again',
        error
      );
    }

    if (message.includes('network') || message.includes('econnrefused')) {
      return this.createError(
        ErrorCode.PROVIDER_NETWORK_ERROR,
        error.message,
        'Network connection failed',
        'Check your internet connection and provider endpoint',
        error
      );
    }

    if (message.includes('file not found') || message.includes('enoent')) {
      return this.createError(
        ErrorCode.FILE_NOT_FOUND,
        error.message,
        'File not found',
        'Verify the file path and try again',
        error
      );
    }

    if (message.includes('permission denied') || message.includes('eacces')) {
      return this.createError(
        ErrorCode.FILE_ACCESS_DENIED,
        error.message,
        'Permission denied',
        'Check file permissions and try again',
        error
      );
    }

    // Default unknown error
    return this.createError(
      ErrorCode.UNKNOWN_ERROR,
      error.message,
      context ? `Error in ${context}` : 'An unexpected error occurred',
      'Please check the logs or contact support',
      error
    );
  }

  /**
   * Format error for display
   */
  static formatError(error: AppError, includeCode = true): string {
    let formatted = '';

    if (includeCode) {
      formatted += `[${error.code}] `;
    }

    formatted += error.userMessage;

    if (error.helpText) {
      formatted += `\n💡 ${error.helpText}`;
    }

    return formatted;
  }

  /**
   * Format error for logging (includes sensitive data)
   */
  static formatForLogging(error: AppError): string {
    return JSON.stringify({
      code: error.code,
      message: error.message, // Original, unsanitized
      userMessage: error.userMessage,
      details: error.details,
      stack: error.originalError?.stack,
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: AppError): boolean {
    return [
      ErrorCode.PROVIDER_RATE_LIMIT,
      ErrorCode.PROVIDER_NETWORK_ERROR,
      ErrorCode.COMMAND_TIMEOUT,
    ].includes(error.code);
  }

  /**
   * Get suggested action for error
   */
  static getSuggestedAction(error: AppError): string {
    const suggestions: Record<string, string> = {
      [ErrorCode.AUTH_INVALID_API_KEY]: 'Run: /provider <name> to configure API key',
      [ErrorCode.AUTH_MISSING_API_KEY]: 'Run: /setup to configure provider',
      [ErrorCode.PROVIDER_NOT_AVAILABLE]: 'Check provider configuration with /config',
      [ErrorCode.SESSION_NOT_FOUND]: 'Use /list to see available sessions',
      [ErrorCode.COMMAND_NOT_ALLOWED]: 'Use /help to see allowed commands',
      [ErrorCode.FILE_PATH_TRAVERSAL]: 'Use relative paths within the project',
    };

    if (suggestions[error.code]) {
      return suggestions[error.code];
    }

    // Contextual fallback based on error code prefix
    const codePrefix = String(error.code).split('_')[0];
    switch (codePrefix) {
      case 'AUTH':
        return 'Check your authentication credentials and provider setup.';
      case 'PROVIDER':
        return 'Verify provider configuration and network connectivity.';
      case 'SESSION':
        return 'Ensure the session exists and is active.';
      case 'COMMAND':
        return 'Check command syntax or permissions.';
      case 'FILE':
        return 'Check file path and permissions.';
      case 'TOOL':
        return 'Verify tool arguments and usage.';
      default:
        return 'Check your configuration or contact support for assistance.';
    }
  }
}
