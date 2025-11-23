import * as path from 'path';

/**
 * Command argument validation utilities
 */
export class CommandValidator {
  // Dangerous characters that could enable command injection
  private static readonly DANGEROUS_CHARS = /[;&|`$()<>#\n\r\0]/;

  // Maximum argument length to prevent buffer overflow
  private static readonly MAX_ARG_LENGTH = 2048;

  // Command-specific argument schemas
  private static readonly COMMAND_SCHEMAS: Record<string, ArgumentSchema> = {
    git: {
      allowedFlags: ['-a', '-m', '-p', '-v', '--all', '--version', '--help', '--status'],
      allowedSubcommands: ['status', 'log', 'diff', 'branch', 'add', 'commit', 'push', 'pull'],
      requiresSubcommand: true,
    },
    npm: {
      allowedFlags: ['-v', '--version', '-g', '--global', '--save', '--save-dev'],
      allowedSubcommands: ['install', 'test', 'run', 'version', 'list'],
      requiresSubcommand: true,
    },
    ls: {
      allowedFlags: ['-l', '-a', '-h', '-R', '-t'],
      allowedSubcommands: [],
      requiresSubcommand: false,
    },
    // Add more commands as needed
  };

  /**
   * Validate command arguments for security
   */
  static validateArguments(command: string, args: string[]): ValidationResult {
    const errors: string[] = [];

    // Check each argument
    for (const arg of args) {
      // Length check
      if (arg.length > this.MAX_ARG_LENGTH) {
        errors.push(`Argument exceeds maximum length: ${arg.substring(0, 50)}...`);
        continue;
      }

      // Check for dangerous characters (unless it's a quoted string)
      if (this.DANGEROUS_CHARS.test(arg) && !this.isQuotedString(arg)) {
        errors.push(`Argument contains dangerous characters: ${arg}`);
        continue;
      }

      // Path traversal check for arguments that look like paths
      if (this.looksLikePath(arg)) {
        const validationError = this.validatePath(arg);
        if (validationError) {
          errors.push(validationError);
        }
      }
    }

    // Command-specific validation
    const schema = this.COMMAND_SCHEMAS[command];
    if (schema) {
      const schemaErrors = this.validateAgainstSchema(args, schema);
      errors.push(...schemaErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedArgs: errors.length === 0 ? args : [],
    };
  }

  /**
   * Check if string is properly quoted
   */
  private static isQuotedString(arg: string): boolean {
    return (
      (arg.startsWith('"') && arg.endsWith('"')) ||
      (arg.startsWith("'") && arg.endsWith("'"))
    );
  }

  /**
   * Check if argument looks like a file path
   */
  private static looksLikePath(arg: string): boolean {
    return (
      arg.includes('/') ||
      arg.includes('\\') ||
      arg.startsWith('.') ||
      arg.includes(path.sep)
    );
  }

  /**
   * Validate path argument
   */
  private static validatePath(pathArg: string): string | null {
    // Remove quotes if present
    const cleanPath = pathArg.replace(/^["']|["']$/g, '');

    // Check for path traversal
    if (cleanPath.includes('..')) {
      return `Path traversal detected: ${pathArg}`;
    }

    // Check for absolute paths outside project (if it starts with /)
    if (path.isAbsolute(cleanPath)) {
      const projectRoot = process.cwd();
      const resolved = path.resolve(cleanPath);
      if (!resolved.startsWith(projectRoot)) {
        return `Absolute path outside project: ${pathArg}`;
      }
    }

    return null;
  }

  /**
   * Validate arguments against command schema
   */
  private static validateAgainstSchema(
    args: string[],
    schema: ArgumentSchema
  ): string[] {
    const errors: string[] = [];

    if (schema.requiresSubcommand && args.length === 0) {
      errors.push('Command requires a subcommand');
      return errors;
    }

    if (schema.requiresSubcommand) {
      const subcommand = args[0];
      if (!schema.allowedSubcommands.includes(subcommand)) {
        errors.push(
          `Invalid subcommand: ${subcommand}. Allowed: ${schema.allowedSubcommands.join(', ')}`
        );
      }
    }

    // Validate flags
    const flags = args.filter(arg => arg.startsWith('-'));
    for (const flag of flags) {
      if (!schema.allowedFlags.includes(flag)) {
        errors.push(`Invalid flag: ${flag}. Allowed: ${schema.allowedFlags.join(', ')}`);
      }
    }

    return errors;
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedArgs: string[];
}

interface ArgumentSchema {
  allowedFlags: string[];
  allowedSubcommands: string[];
  requiresSubcommand: boolean;
}