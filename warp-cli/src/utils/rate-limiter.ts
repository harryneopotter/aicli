/**
 * Rate limiting and retry utilities for API providers
 */

/**
 * Rate limiter to prevent exceeding API quotas
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Throttle requests to stay within rate limits
   * @param key Unique key for the rate limit (e.g., provider name)
   * @param maxRequests Maximum number of requests allowed
   * @param windowMs Time window in milliseconds
   */
  async throttle(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<void> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove requests outside the time window
    const recentRequests = requests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      // Calculate wait time until oldest request expires
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = windowMs - (now - oldestRequest) + 100; // Add 100ms buffer

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Refresh after waiting
      return this.throttle(key, maxRequests, windowMs);
    }

    // Record this request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
  }

  /**
   * Clear rate limit history for a key
   * @param key Rate limit key to clear
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limit history
   */
  clearAll(): void {
    this.requests.clear();
  }

  /**
   * Get current request count for a key within the window
   * @param key Rate limit key
   * @param windowMs Time window in milliseconds
   */
  getRequestCount(key: string, windowMs: number): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    return requests.filter(time => now - time < windowMs).length;
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds (doubles each retry)
 * @param onRetry Optional callback called before each retry
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }

      // Last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if an error should not be retried
 * @param error The error to check
 */
function isNonRetryableError(error: any): boolean {
  // Don't retry on authentication errors
  if (error.status === 401 || error.status === 403) {
    return true;
  }

  // Don't retry on bad request errors
  if (error.status === 400) {
    return true;
  }

  // Don't retry on validation errors
  if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    return true;
  }

  return false;
}

/**
 * Retry with jitter to prevent thundering herd
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds
 */
export async function withRetryAndJitter<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  return withRetry(
    fn,
    maxRetries,
    baseDelay,
    (attempt, error) => {
      const jitter = Math.random() * 500; // Add up to 500ms random jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay.toFixed(0)}ms: ${error.message}`);
    }
  );
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();
