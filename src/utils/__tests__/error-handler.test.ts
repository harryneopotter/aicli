import { ErrorHandler, ErrorCode } from '../error-handler';

describe('ErrorHandler', () => {
  it('should sanitize API keys', () => {
    const msg = 'sk-1234567890abcdef1234567890abcdef';
    expect(ErrorHandler.sanitizeMessage(msg)).not.toContain('sk-');
    expect(ErrorHandler.sanitizeMessage(msg)).toContain('***REDACTED***');
  });

  it('should sanitize file paths', () => {
    const msg = '/home/user/secrets.txt';
    expect(ErrorHandler.sanitizeMessage(msg)).toContain('***REDACTED***');
  });

  it('should create structured AppError', () => {
    const err = ErrorHandler.createError(ErrorCode.FILE_NOT_FOUND, 'ENOENT', 'File not found');
    expect(err.code).toBe(ErrorCode.FILE_NOT_FOUND);
    expect(err.userMessage).toBe('File not found');
  });

  it('should map ENOENT to FILE_NOT_FOUND', () => {
    const error = new Error('ENOENT: file not found');
    const appError = ErrorHandler.fromError(error);
    expect(appError.code).toBe(ErrorCode.FILE_NOT_FOUND);
  });

  it('should identify retryable errors', () => {
    const err = ErrorHandler.createError(ErrorCode.PROVIDER_RATE_LIMIT, 'Rate limit', 'Rate limit');
    expect(ErrorHandler.isRetryable(err)).toBe(true);
  });
});
