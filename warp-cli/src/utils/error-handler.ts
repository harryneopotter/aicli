/**
 * Enhanced error handling with user-friendly messages
 */

import { uiRenderer } from '../ui/renderer';
import { auditService } from '../services/audit.service';
import { sanitizeErrorMessage } from './security';

/**
 * User-friendly error with suggestions
 */
export class UserFriendlyError extends Error {
  constructor(
    message: string,
    public readonly suggestion?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'UserFriendlyError';
  }
}

/**
 * Handle errors with user-friendly messages and suggestions
 * @param error The error to handle
 * @param context Optional context for logging
 */
export async function handleError(error: any, context?: string): Promise<void> {
  // Log to audit service
  await auditService.logSecurityEvent(
    'error_occurred',
    `Error in ${context || 'unknown'}: ${sanitizeErrorMessage(error.message || String(error))}`,
    'failure'
  );

  // Handle specific error types
  if (error instanceof UserFriendlyError) {
    uiRenderer.renderError(error.message);
    if (error.suggestion) {
      uiRenderer.renderInfo(`💡 Suggestion: ${error.suggestion}`);
    }
    return;
  }

  // Network errors
  if (error.code === 'ECONNREFUSED') {
    uiRenderer.renderError('Cannot connect to service');
    uiRenderer.renderInfo('💡 Make sure the service is running (e.g., Ollama on http://localhost:11434)');
    return;
  }

  if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    uiRenderer.renderError('Network timeout or DNS resolution failed');
    uiRenderer.renderInfo('💡 Check your internet connection and try again');
    return;
  }

  // API errors
  if (error.status === 401) {
    uiRenderer.renderError('Authentication failed - Invalid API key');
    uiRenderer.renderInfo('💡 Update your API key: warp config --set providers.<provider>.apiKey=YOUR_KEY');
    return;
  }

  if (error.status === 403) {
    uiRenderer.renderError('Access forbidden - Check your API key permissions');
    uiRenderer.renderInfo('💡 Verify your API key has the necessary permissions');
    return;
  }

  if (error.status === 429) {
    uiRenderer.renderError('Rate limit exceeded');
    uiRenderer.renderInfo('💡 Wait a moment and try again. Consider upgrading your API plan for higher limits.');
    return;
  }

  if (error.status === 500 || error.status === 502 || error.status === 503) {
    uiRenderer.renderError('Service temporarily unavailable');
    uiRenderer.renderInfo('💡 The API provider is experiencing issues. Try again in a few moments.');
    return;
  }

  // API key errors
  if (error.message?.toLowerCase().includes('api key') ||
      error.message?.toLowerCase().includes('apikey')) {
    uiRenderer.renderError('API key issue');
    uiRenderer.renderInfo('💡 Configure your API key: warp config --set providers.<provider>.apiKey=YOUR_KEY');
    return;
  }

  // Database errors
  if (error.message?.includes('SQLITE') || error.message?.includes('database')) {
    uiRenderer.renderError('Database error');
    uiRenderer.renderInfo('💡 Your session database may be corrupted. Try deleting ~/.warp-cli/sessions/');
    return;
  }

  // File system errors
  if (error.code === 'ENOENT') {
    uiRenderer.renderError('File or directory not found');
    uiRenderer.renderInfo(`💡 Path: ${error.path || 'unknown'}`);
    return;
  }

  if (error.code === 'EACCES' || error.code === 'EPERM') {
    uiRenderer.renderError('Permission denied');
    uiRenderer.renderInfo('💡 Check file permissions or try running with appropriate privileges');
    return;
  }

  // Command validation errors
  if (error.message?.includes('validation') || error.message?.includes('not in the allowed list')) {
    uiRenderer.renderError(error.message);
    uiRenderer.renderInfo('💡 Use /help to see available commands');
    return;
  }

  // Default: Unknown error
  const sanitized = sanitizeErrorMessage(error.message || String(error));
  uiRenderer.renderError(`Unexpected error: ${sanitized}`);
  uiRenderer.renderInfo('💡 If this persists, please report it: https://github.com/harryneopotter/aicli/issues');
}

/**
 * Wrap a function with error handling
 * @param fn Function to wrap
 * @param context Context for error logging
 * @returns Wrapped function
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error, context);
      throw error; // Re-throw for caller to handle if needed
    }
  }) as T;
}

/**
 * Get a user-friendly error message for common error codes
 * @param errorCode Error code
 * @returns User-friendly message
 */
export function getErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'ECONNREFUSED': 'Connection refused - service is not running',
    'ETIMEDOUT': 'Connection timed out',
    'ENOTFOUND': 'Host not found - check the URL',
    'EACCES': 'Permission denied',
    'EPERM': 'Operation not permitted',
    'ENOENT': 'File or directory not found',
    'EEXIST': 'File already exists',
    'EMFILE': 'Too many open files',
    'ENOSPC': 'No space left on device'
  };

  return messages[errorCode] || `Error: ${errorCode}`;
}
