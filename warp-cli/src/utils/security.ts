/**
 * Security utility functions for input validation and sanitization
 */

// Dangerous command patterns that could lead to command injection
const DANGEROUS_PATTERNS = [
  /[;&|`$(){}[\]<>]/g, // Shell metacharacters
  /\$\(.*\)/g, // Command substitution
  /`.*`/g, // Backticks
  /\|\|/g, // OR operator
  /&&/g, // AND operator
  />/g, // Redirection
  /</g, // Input redirection
];

// Allowed command whitelist for safer execution
const ALLOWED_COMMANDS = [
  'ls', 'pwd', 'echo', 'cat', 'grep', 'find', 'wc',
  'git', 'npm', 'node', 'python', 'python3',
  'cargo', 'go', 'mvn', 'gradle',
  'docker', 'kubectl',
  'curl', 'wget'
];

/**
 * Validates if a command is safe to execute
 * @param command The command string to validate
 * @returns Object with validation result and optional error message
 */
export function validateCommand(command: string): { valid: boolean; error?: string } {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: 'Command must be a non-empty string' };
  }

  const trimmed = command.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Command cannot be empty' };
  }

  // Extract base command
  const baseCommand = trimmed.split(/\s+/)[0];

  // Check if command is in whitelist
  if (!ALLOWED_COMMANDS.includes(baseCommand)) {
    return {
      valid: false,
      error: `Command '${baseCommand}' is not in the allowed list. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`
    };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Command contains potentially dangerous characters or patterns'
      };
    }
  }

  // Additional length check to prevent buffer overflow attempts
  if (trimmed.length > 1000) {
    return {
      valid: false,
      error: 'Command exceeds maximum allowed length'
    };
  }

  return { valid: true };
}

/**
 * Sanitizes command arguments by escaping special characters
 * @param arg The argument to sanitize
 * @returns Sanitized argument
 */
export function sanitizeArgument(arg: string): string {
  if (!arg) return '';

  // Remove or escape dangerous characters
  return arg
    .replace(/[;&|`$(){}[\]<>]/g, '') // Remove shell metacharacters
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"') // Escape quotes
    .trim();
}

/**
 * Validates and sanitizes a full command with arguments
 * @param command The full command string
 * @returns Object with sanitized command and validation result
 */
export function sanitizeCommand(command: string): {
  sanitized: string;
  valid: boolean;
  error?: string;
} {
  const validation = validateCommand(command);

  if (!validation.valid) {
    return {
      sanitized: '',
      valid: false,
      error: validation.error
    };
  }

  const parts = command.trim().split(/\s+/);
  const baseCommand = parts[0];
  const args = parts.slice(1).map(sanitizeArgument);

  return {
    sanitized: `${baseCommand} ${args.join(' ')}`.trim(),
    valid: true
  };
}

/**
 * Sanitizes sensitive data from error messages and logs
 * @param message The message to sanitize
 * @returns Sanitized message
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return '';

  return message
    // Remove API keys
    .replace(/api[_-]?key[:\s]*[a-zA-Z0-9-_]+/gi, 'api_key: [REDACTED]')
    // Remove tokens
    .replace(/token[:\s]*[a-zA-Z0-9-_]+/gi, 'token: [REDACTED]')
    // Remove passwords
    .replace(/password[:\s]*[^\s]+/gi, 'password: [REDACTED]')
    // Remove JWT tokens
    .replace(/Bearer\s+[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/gi, 'Bearer [REDACTED]');
}

/**
 * Masks sensitive configuration values
 * @param config Configuration object
 * @returns Configuration with masked sensitive values
 */
export function maskSensitiveConfig(config: any): any {
  const masked = JSON.parse(JSON.stringify(config)); // Deep clone

  function maskRecursive(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        maskRecursive(obj[key]);
      } else if (
        typeof obj[key] === 'string' &&
        (key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret'))
      ) {
        const value = obj[key];
        if (value && value.length > 4) {
          obj[key] = `${value.substring(0, 4)}${'*'.repeat(value.length - 4)}`;
        } else {
          obj[key] = '****';
        }
      }
    }
  }

  maskRecursive(masked);
  return masked;
}

/**
 * Validates FTS query to prevent injection attacks
 * @param query The FTS query string
 * @returns Validation result
 */
export function validateFTSQuery(query: string): { valid: boolean; error?: string } {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' };
  }

  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /;\s*drop\s+table/gi,
    /;\s*delete\s+from/gi,
    /;\s*update\s+/gi,
    /union\s+select/gi,
    /--/g,
    /\/\*/g,
    /\*\//g
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Query contains potentially malicious SQL patterns'
      };
    }
  }

  return { valid: true };
}

/**
 * Safely parses JSON with error handling
 * @param jsonString The JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJSONParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse error:', sanitizeErrorMessage((error as Error).message));
    return fallback;
  }
}
