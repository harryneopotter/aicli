# Implementation Document: Feature Enhancements & Long-term Improvements

**Project:** AiCli
**Document Version:** 1.0
**Date:** 2025-11-22
**Status:** Ready for Planning
**Owner:** Product & Engineering Teams

---

## Executive Summary

This document outlines the implementation plan for **feature enhancements**, **architectural improvements**, and **long-term strategic initiatives** identified in the comprehensive code review. These items are categorized as P2 (Medium Priority) and P3 (Future Enhancements) and should be addressed over the next 3-6 months.

### Scope Overview

- **Medium Priority (P2):** 8 items - UX, Performance, Configuration
- **New Features (P3):** 6 major features - Plugin System, Analytics, Multi-user
- **Estimated Total Effort:** 10-12 weeks
- **Team Size:** 2-4 engineers
- **Target Completion:** 6 months from start

---

## Table of Contents

1. [P2-001: Add Docker Support](#p2-001-add-docker-support)
2. [P2-002: Improve Error Messages & Sanitization](#p2-002-improve-error-messages--sanitization)
3. [P2-003: Add Input Validation Framework](#p2-003-add-input-validation-framework)
4. [P2-004: Update Node Version Requirements](#p2-004-update-node-version-requirements)
5. [P2-005: Extract Configuration Constants](#p2-005-extract-configuration-constants)
6. [P2-006: Add Performance Monitoring](#p2-006-add-performance-monitoring)
7. [P2-007: Implement Caching Layer](#p2-007-implement-caching-layer)
8. [P2-008: Add Session Pagination](#p2-008-add-session-pagination)
9. [P3-001: Build Plugin System](#p3-001-build-plugin-system)
10. [P3-002: Add Telemetry & Analytics](#p3-002-add-telemetry--analytics)
11. [P3-003: Interactive Mode Improvements](#p3-003-interactive-mode-improvements)
12. [P3-004: Code Review Mode](#p3-004-code-review-mode)
13. [P3-005: Web UI (Optional)](#p3-005-web-ui-optional)
14. [P3-006: Multi-User Support](#p3-006-multi-user-support)
15. [Long-term Roadmap](#long-term-roadmap)

---

## P2-001: Add Docker Support

### Priority: P2 (Medium)
### Estimated Effort: 4 hours
### Risk Level: LOW

### Problem Statement

Users need a consistent, isolated environment to run AiCli. Docker provides:
- Easy deployment across platforms
- Consistent dependencies
- Isolation from system configurations
- Easy CI/CD integration

### Implementation Steps

#### Step 1: Create Dockerfile (1 hour)

**File:** `Dockerfile`

```dockerfile
# Multi-stage build for smaller image size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY aicli/package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY aicli/ ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    libsecret-dev

# Create non-root user
RUN addgroup -g 1001 -S aicli && \
    adduser -S aicli -u 1001

# Set working directory
WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=aicli:aicli /app/dist ./dist
COPY --from=builder --chown=aicli:aicli /app/node_modules ./node_modules
COPY --from=builder --chown=aicli:aicli /app/package.json ./

# Create data directory for sessions
RUN mkdir -p /home/aicli/.aicli && \
    chown -R aicli:aicli /home/aicli

# Switch to non-root user
USER aicli

# Set environment
ENV NODE_ENV=production \
    HOME=/home/aicli

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["chat"]
```

#### Step 2: Create Docker Compose (1 hour)

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  aicli:
    build:
      context: .
      dockerfile: Dockerfile
    image: aicli:latest
    container_name: aicli

    # Interactive terminal
    stdin_open: true
    tty: true

    # Environment variables
    environment:
      # LLM Provider API Keys
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GLM_API_KEY=${GLM_API_KEY}

      # Provider selection
      - DEFAULT_PROVIDER=${DEFAULT_PROVIDER:-ollama}

      # Ollama endpoint (if using local Ollama)
      - OLLAMA_ENDPOINT=${OLLAMA_ENDPOINT:-http://host.docker.internal:11434}

    # Volume mounts
    volumes:
      # Persist sessions and configuration
      - aicli-data:/home/aicli/.aicli

      # Mount project directory (for file operations)
      - ${PROJECT_DIR:-./workspace}:/workspace

      # Git configuration
      - ~/.gitconfig:/home/aicli/.gitconfig:ro

    # Working directory
    working_dir: /workspace

    # Network
    networks:
      - aicli-network

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Optional: Run local Ollama instance
  ollama:
    image: ollama/ollama:latest
    container_name: aicli-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    networks:
      - aicli-network
    deploy:
      resources:
        limits:
          memory: 8G

volumes:
  aicli-data:
    driver: local
  ollama-data:
    driver: local

networks:
  aicli-network:
    driver: bridge
```

#### Step 3: Create .dockerignore (15 minutes)

**File:** `.dockerignore`

```
# Dependencies
node_modules/
npm-debug.log
package-lock.json

# Build artifacts
dist/
coverage/
*.log

# Development files
.git/
.gitignore
.env
.env.local
*.md
!README.md

# Test files
**/__tests__/
**/*.test.ts
jest.config.js

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project specific
.not-needed/
.aicli/
```

#### Step 4: Create Quick Start Script (30 minutes)

**File:** `docker-start.sh`

```bash
#!/bin/bash

# AiCli Docker Quick Start Script

set -e

echo "🚀 AiCli Docker Setup"
echo "===================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# LLM Provider API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
GLM_API_KEY=

# Default provider (ollama, openai, anthropic, gemini, glm)
DEFAULT_PROVIDER=ollama

# Ollama endpoint (for local Ollama)
OLLAMA_ENDPOINT=http://ollama:11434

# Project directory to mount
PROJECT_DIR=./workspace
EOF
    echo "✅ Created .env file. Please edit it to add your API keys."
    echo ""
fi

# Create workspace directory
if [ ! -d "workspace" ]; then
    mkdir -p workspace
    echo "📁 Created workspace directory"
fi

# Build or pull image
echo "🔨 Building Docker image..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 3

# Show logs
echo ""
echo "📋 Service Status:"
docker-compose ps

echo ""
echo "✨ AiCli is ready!"
echo ""
echo "To start chatting:"
echo "  docker-compose exec aicli node dist/cli.js chat"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f aicli"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
```

#### Step 5: Add Docker Documentation (1 hour)

**File:** `DOCKER.md`

```markdown
# Docker Deployment Guide

## Quick Start

```bash
chmod +x docker-start.sh
./docker-start.sh
```

## Manual Setup

### 1. Build Image

```bash
docker-compose build
```

### 2. Configure Environment

Edit `.env` file with your API keys:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_PROVIDER=openai
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Run AiCli

```bash
docker-compose exec aicli node dist/cli.js chat
```

## Advanced Usage

### Using Local Ollama

Start Ollama service:

```bash
docker-compose up -d ollama
```

Pull a model:

```bash
docker-compose exec ollama ollama pull llama3.2
```

### Mounting Your Project

Edit `docker-compose.yml`:

```yaml
volumes:
  - /path/to/your/project:/workspace
```

### Running Commands

Execute shell commands in the container:

```bash
docker-compose exec aicli sh
```

### Persistent Sessions

Sessions are stored in the `aicli-data` volume and persist across container restarts.

View sessions:

```bash
docker volume inspect aicli-data
```

### Custom Configuration

Override default config:

```bash
docker-compose run --rm aicli node dist/cli.js setup
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs aicli
```

### API Keys Not Working

Verify environment variables:
```bash
docker-compose exec aicli env | grep API_KEY
```

### Permission Issues

Ensure proper ownership:
```bash
docker-compose exec aicli ls -la /home/aicli/.aicli
```

### Network Issues

Check Ollama connectivity:
```bash
docker-compose exec aicli wget -qO- http://ollama:11434/api/version
```

## Production Deployment

### Security Best Practices

1. **Use Secrets Management**
   ```bash
   docker secret create openai_api_key ./openai_key.txt
   ```

2. **Read-only Root Filesystem**
   ```yaml
   security_opt:
     - no-new-privileges:true
   read_only: true
   ```

3. **Resource Limits**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

### Kubernetes Deployment

See `k8s/` directory for Kubernetes manifests.

### CI/CD Integration

GitHub Actions example:

```yaml
- name: Build Docker Image
  run: docker build -t aicli:${{ github.sha }} .

- name: Run Tests in Container
  run: docker run aicli:${{ github.sha }} npm test
```

## Image Size Optimization

Current image size: ~150MB (Alpine-based)

Further optimization:
- Multi-stage builds (already implemented)
- Prune dev dependencies
- Use distroless base image

## Updates

Pull latest image:
```bash
docker-compose pull
docker-compose up -d
```

Rebuild from source:
```bash
docker-compose build --no-cache
```
```

### Testing Requirements

1. **Build Test:** Image builds successfully
2. **Run Test:** Container starts without errors
3. **API Test:** Can connect to LLM providers
4. **Volume Test:** Sessions persist across restarts
5. **Network Test:** Can access Ollama service

### Acceptance Criteria

- [ ] Dockerfile builds successfully
- [ ] Image size < 200MB
- [ ] Container starts in < 5 seconds
- [ ] All LLM providers work
- [ ] Sessions persist correctly
- [ ] Documentation complete
- [ ] Security scan passes (Trivy/Snyk)

---

## P2-002: Improve Error Messages & Sanitization

### Priority: P2 (Medium)
### Estimated Effort: 6 hours
### Risk Level: LOW

### Problem Statement

Current error messages may leak sensitive information (API keys, file paths, stack traces). Need to:
- Sanitize errors before displaying to users
- Add error codes for programmatic handling
- Improve error message clarity
- Add contextual help

### Implementation Steps

#### Step 1: Create Error Utility (2 hours)

**File:** `aicli/src/utils/error-handler.ts`

```typescript
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

  private static readonly SANITIZATION_REPLACEMENTS: Record<string, string> = {
    'sk-': '***API_KEY***',
    'sk-ant-': '***API_KEY***',
    '/home/': '/home/***',
    '/Users/': '/Users/***',
    'C:\\Users\\': 'C:\\Users\\***',
    'password': 'password=***',
    'api_key': 'api_key=***',
  };

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

    return suggestions[error.code] || 'Use /help for more information';
  }
}

/**
 * Decorator for automatic error handling
 */
export function handleErrors(context: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const appError = ErrorHandler.fromUnknown(error, context);
        throw appError;
      }
    };

    return descriptor;
  };
}
```

#### Step 2: Update Services to Use Error Handler (2 hours)

**Example: Update ChatService**

```typescript
import { ErrorHandler, ErrorCode, AppError } from '../utils/error-handler';

export class ChatService {
  async chat(userMessage: string, options?: { streaming?: boolean }): Promise<string> {
    try {
      if (!this.currentProvider) {
        throw ErrorHandler.createError(
          ErrorCode.PROVIDER_NOT_AVAILABLE,
          'No provider initialized',
          'No AI provider configured',
          'Run /setup to configure a provider'
        );
      }

      const session = sessionService.getCurrentSession();
      if (!session) {
        throw ErrorHandler.createError(
          ErrorCode.SESSION_NOT_FOUND,
          'No active session',
          'No active chat session',
          'A new session will be created automatically'
        );
      }

      // ... rest of implementation
    } catch (error) {
      const appError = ErrorHandler.fromUnknown(error, 'ChatService.chat');

      // Log full error (with sensitive data for debugging)
      console.error(ErrorHandler.formatForLogging(appError));

      // Show sanitized error to user
      uiRenderer.renderError(ErrorHandler.formatError(appError));

      throw appError;
    }
  }
}
```

#### Step 3: Add Error Tests (1 hour)

**File:** `aicli/src/utils/__tests__/error-handler.test.ts`

```typescript
import { ErrorHandler, ErrorCode } from '../error-handler';

describe('ErrorHandler', () => {
  describe('sanitizeMessage', () => {
    it('should redact API keys', () => {
      const message = 'Error: Invalid API key sk-1234567890abcdef1234567890abcdef';
      const sanitized = ErrorHandler.sanitizeMessage(message);
      expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef');
      expect(sanitized).toContain('***REDACTED***');
    });

    it('should redact Anthropic API keys', () => {
      const message = 'Using key: sk-ant-api03-abc123...';
      const sanitized = ErrorHandler.sanitizeMessage(message);
      expect(sanitized).toContain('***REDACTED***');
    });

    it('should redact file paths', () => {
      const message = 'File not found: /home/user/secrets/key.txt';
      const sanitized = ErrorHandler.sanitizeMessage(message);
      expect(sanitized).not.toContain('/home/user');
      expect(sanitized).toContain('***REDACTED***');
    });

    it('should redact passwords', () => {
      const message = 'Connection failed with password=secret123';
      const sanitized = ErrorHandler.sanitizeMessage(message);
      expect(sanitized).not.toContain('secret123');
    });
  });

  describe('fromError', () => {
    it('should recognize API key errors', () => {
      const error = new Error('Invalid API key provided');
      const appError = ErrorHandler.fromError(error);

      expect(appError.code).toBe(ErrorCode.AUTH_INVALID_API_KEY);
      expect(appError.helpText).toContain('provider');
    });

    it('should recognize rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      const appError = ErrorHandler.fromError(error);

      expect(appError.code).toBe(ErrorCode.PROVIDER_RATE_LIMIT);
      expect(ErrorHandler.isRetryable(appError)).toBe(true);
    });

    it('should recognize file not found errors', () => {
      const error = new Error('ENOENT: file not found');
      const appError = ErrorHandler.fromError(error);

      expect(appError.code).toBe(ErrorCode.FILE_NOT_FOUND);
    });
  });

  describe('formatError', () => {
    it('should format error with code', () => {
      const error = ErrorHandler.createError(
        ErrorCode.AUTH_INVALID_API_KEY,
        'Test error',
        'Invalid API key',
        'Run setup'
      );

      const formatted = ErrorHandler.formatError(error);
      expect(formatted).toContain('[AUTH_1001]');
      expect(formatted).toContain('Invalid API key');
      expect(formatted).toContain('💡 Run setup');
    });
  });
});
```

#### Step 4: Add User Documentation (1 hour)

**File:** `aicli/ERROR_CODES.md`

```markdown
# Error Codes Reference

## Authentication Errors (1xxx)

### AUTH_1001: Invalid API Key
**Cause:** The API key is invalid or expired
**Solution:** Update your API key with `/provider <name>`

### AUTH_1002: Missing API Key
**Cause:** No API key configured for the provider
**Solution:** Run `/setup` to configure provider

### AUTH_1003: Keychain Access Denied
**Cause:** Permission denied to access system keychain
**Solution:** Grant keychain access in system preferences

## Provider Errors (2xxx)

### PROVIDER_2001: Provider Not Available
**Cause:** Selected provider is not responding
**Solution:** Check network connection or try fallback provider

### PROVIDER_2002: Rate Limit Exceeded
**Cause:** Too many requests to provider API
**Solution:** Wait a moment before retrying

### PROVIDER_2003: Network Error
**Cause:** Cannot connect to provider endpoint
**Solution:** Check internet connection and firewall settings

## Session Errors (3xxx)

### SESSION_3001: Session Not Found
**Cause:** Requested session ID doesn't exist
**Solution:** Use `/list` to see available sessions

### SESSION_3004: Decryption Failed
**Cause:** Session data is corrupted or encryption key changed
**Solution:** Delete corrupted session or restore from backup

## Command Errors (4xxx)

### COMMAND_4001: Command Not Allowed
**Cause:** Command is not in whitelist
**Solution:** Use `/help` to see allowed commands

### COMMAND_4002: Command Injection Blocked
**Cause:** Security filter detected malicious input
**Solution:** Remove special characters from command

## File Errors (5xxx)

### FILE_5001: File Not Found
**Cause:** File path doesn't exist
**Solution:** Verify path and try again

### FILE_5003: Path Traversal Blocked
**Cause:** Attempted to access file outside project
**Solution:** Use paths relative to project root

## Getting Help

For unlisted errors or persistent issues:
1. Check logs: `~/.aicli/logs/`
2. Run with debug: `DEBUG=* aicli chat`
3. Report issue: https://github.com/user/aicli/issues
```

### Acceptance Criteria

- [ ] All error messages sanitized
- [ ] Error codes implemented
- [ ] No sensitive data in user-facing errors
- [ ] Help text provided for common errors
- [ ] Documentation complete
- [ ] Tests pass

---

## P2-003: Add Input Validation Framework

### Priority: P2 (Medium)
### Estimated Effort: 8 hours
### Risk Level: MEDIUM

### Problem Statement

Tool arguments and user inputs are not consistently validated, creating potential for:
- Type errors at runtime
- Invalid data passed to services
- Poor error messages
- Security vulnerabilities

### Implementation Steps

#### Step 1: Install Validation Library (15 minutes)

```bash
npm install zod
npm install --save-dev @types/node
```

#### Step 2: Create Validation Schemas (3 hours)

**File:** `aicli/src/validation/schemas.ts`

```typescript
import { z } from 'zod';

/**
 * Validation schemas for tool arguments and user inputs
 */

// Common validators
export const filePathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .max(1024, 'Path too long')
  .refine(
    (path) => !path.includes('..'),
    'Path traversal not allowed'
  )
  .refine(
    (path) => !/[<>:"|?*]/.test(path),
    'Invalid characters in path'
  );

export const commandSchema = z.string()
  .min(1, 'Command cannot be empty')
  .max(2048, 'Command too long')
  .refine(
    (cmd) => !/[;&|`$]/.test(cmd),
    'Command contains dangerous characters'
  );

// Tool argument schemas
export const execToolArgsSchema = z.object({
  command: commandSchema,
});

export const readFileToolArgsSchema = z.object({
  path: filePathSchema,
});

export const writeFileToolArgsSchema = z.object({
  path: filePathSchema,
  content: z.string().max(1024 * 1024, 'Content too large (max 1MB)'),
});

export const listFilesToolArgsSchema = z.object({
  path: filePathSchema.default('.'),
});

export const searchCodeToolArgsSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .max(500, 'Query too long'),
  limit: z.number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .optional(),
});

export const logActivityToolArgsSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(200, 'Title too long'),
  details: z.string()
    .min(1, 'Details required')
    .max(5000, 'Details too long'),
  files: z.array(filePathSchema).default([]),
});

// Provider config schemas
export const providerConfigSchema = z.object({
  model: z.string().min(1),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// Session schemas
export const sessionMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  created: z.date(),
  updated: z.date(),
  messageCount: z.number().int().nonnegative(),
});

// Map tool names to their schemas
export const toolSchemas: Record<string, z.ZodSchema> = {
  exec: execToolArgsSchema,
  read_file: readFileToolArgsSchema,
  write_file: writeFileToolArgsSchema,
  list_files: listFilesToolArgsSchema,
  search_code: searchCodeToolArgsSchema,
  log_activity: logActivityToolArgsSchema,
};

/**
 * Validate tool arguments
 */
export function validateToolArgs(toolName: string, args: unknown): {
  success: boolean;
  data?: any;
  errors?: string[];
} {
  const schema = toolSchemas[toolName];

  if (!schema) {
    return {
      success: false,
      errors: [`No validation schema for tool: ${toolName}`],
    };
  }

  const result = schema.safeParse(args);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    ),
  };
}
```

#### Step 3: Integrate Validation into ToolService (2 hours)

**File:** `aicli/src/services/tool.service.ts`

```typescript
import { validateToolArgs } from '../validation/schemas';
import { ErrorHandler, ErrorCode } from '../utils/error-handler';

export class ToolService {
  private async executeWithValidation(
    tool: Tool,
    rawArgs: unknown
  ): Promise<string> {
    // Validate arguments
    const validation = validateToolArgs(tool.name, rawArgs);

    if (!validation.success) {
      const errorMsg = `Invalid arguments for ${tool.name}:\n${validation.errors?.join('\n')}`;
      throw ErrorHandler.createError(
        ErrorCode.TOOL_INVALID_ARGS,
        errorMsg,
        `Invalid tool arguments`,
        `Check the tool usage: ${tool.usage}`
      );
    }

    // Execute with validated args
    try {
      return await tool.execute(validation.data);
    } catch (error) {
      throw ErrorHandler.fromUnknown(error, `Tool: ${tool.name}`);
    }
  }

  // Update existing methods to use validation
  async executeTool(toolName: string, args: unknown): Promise<string> {
    const tool = this.getTool(toolName);

    if (!tool) {
      throw ErrorHandler.createError(
        ErrorCode.TOOL_NOT_FOUND,
        `Tool not found: ${toolName}`,
        `Unknown tool: ${toolName}`,
        'Use /help to see available tools'
      );
    }

    return this.executeWithValidation(tool, args);
  }
}
```

#### Step 4: Add Validation Tests (2 hours)

**File:** `aicli/src/validation/__tests__/schemas.test.ts`

```typescript
import { validateToolArgs } from '../schemas';

describe('Tool Validation', () => {
  describe('exec tool', () => {
    it('should validate correct arguments', () => {
      const result = validateToolArgs('exec', {
        command: 'ls -la',
      });
      expect(result.success).toBe(true);
      expect(result.data.command).toBe('ls -la');
    });

    it('should reject dangerous characters', () => {
      const result = validateToolArgs('exec', {
        command: 'ls; rm -rf /',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('dangerous characters');
    });

    it('should reject empty command', () => {
      const result = validateToolArgs('exec', {
        command: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('write_file tool', () => {
    it('should validate correct arguments', () => {
      const result = validateToolArgs('write_file', {
        path: 'test.txt',
        content: 'Hello world',
      });
      expect(result.success).toBe(true);
    });

    it('should reject path traversal', () => {
      const result = validateToolArgs('write_file', {
        path: '../../../etc/passwd',
        content: 'malicious',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('traversal');
    });

    it('should reject oversized content', () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const result = validateToolArgs('write_file', {
        path: 'large.txt',
        content: largeContent,
      });
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('too large');
    });
  });

  describe('search_code tool', () => {
    it('should provide default limit', () => {
      const result = validateToolArgs('search_code', {
        query: 'authentication',
      });
      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(10);
    });

    it('should validate limit bounds', () => {
      const result = validateToolArgs('search_code', {
        query: 'test',
        limit: 200,
      });
      expect(result.success).toBe(false);
    });
  });
});
```

#### Step 5: Documentation (30 minutes)

Update tool documentation with validation requirements in README.md and inline comments.

### Acceptance Criteria

- [ ] All tools use validation
- [ ] Clear validation error messages
- [ ] Tests cover edge cases
- [ ] Type safety improved
- [ ] No breaking changes to existing functionality

---

## P2-004 through P2-008

[Due to length, summarized below. Full implementation available on request]

### P2-004: Update Node Version Requirements
- Update `package.json` engines to Node 18+
- Update Dockerfile to use node:20
- Update GitHub Actions
- Update documentation
- **Effort:** 2 hours

### P2-005: Extract Configuration Constants
- Create `src/config/constants.ts`
- Move all magic numbers/strings
- Add type safety
- **Effort:** 4 hours

### P2-006: Add Performance Monitoring
- Add performance markers
- Track operation durations
- Log slow operations
- **Effort:** 6 hours

### P2-007: Implement Caching Layer
- Cache embeddings
- Cache context
- LRU cache implementation
- **Effort:** 8 hours

### P2-008: Add Session Pagination
- Paginate session list
- Cursor-based pagination
- Performance optimization
- **Effort:** 6 hours

---

## P3-001: Build Plugin System

### Priority: P3 (Future)
### Estimated Effort: 2 weeks
### Risk Level: MEDIUM

### Vision

Allow third-party developers to extend AiCli with custom tools, providers, and agents without modifying core code.

### Architecture

```
plugins/
├── @aicli/plugin-github/
│   ├── index.ts          # Plugin entry point
│   ├── tools/            # Custom tools
│   ├── provider.ts       # Optional LLM provider
│   └── package.json
├── @aicli/plugin-jira/
└── @aicli/plugin-slack/
```

### Plugin Interface

```typescript
interface AiCliPlugin {
  name: string;
  version: string;
  description: string;

  tools?: Tool[];
  providers?: LLMProvider[];
  commands?: Command[];

  initialize?(context: PluginContext): Promise<void>;
  cleanup?(): Promise<void>;
}

interface PluginContext {
  config: ConfigService;
  logger: Logger;
  events: EventEmitter;
}
```

### Implementation Phases

**Phase 1: Plugin Loader (Week 1)**
- Dynamic import system
- Plugin validation
- Dependency management
- Sandboxing

**Phase 2: Plugin API (Week 1)**
- Tool registration API
- Provider registration API
- Event system
- Configuration API

**Phase 3: Plugin Marketplace (Week 2)**
- Plugin discovery
- Installation via `/plugin install`
- Version management
- Security scanning

### Example Plugin

```typescript
// @aicli/plugin-github

import { AiCliPlugin, Tool } from '@aicli/sdk';

export default class GitHubPlugin implements AiCliPlugin {
  name = '@aicli/plugin-github';
  version = '1.0.0';
  description = 'GitHub integration for AiCli';

  tools: Tool[] = [
    {
      name: 'create_pr',
      description: 'Create a GitHub pull request',
      usage: '{"name": "create_pr", "arguments": {"title": "...", "body": "..."}}',
      execute: async (args) => {
        // Implementation
      },
    },
    {
      name: 'list_issues',
      description: 'List GitHub issues',
      usage: '{"name": "list_issues", "arguments": {"repo": "..."}}',
      execute: async (args) => {
        // Implementation
      },
    },
  ];

  async initialize(context: PluginContext) {
    context.logger.info('GitHub plugin initialized');
  }
}
```

### Security Considerations

- Plugin sandbox (VM2 or isolated-vm)
- Permission system (filesystem, network, etc.)
- Code signing for verified plugins
- Automatic security scans
- Audit logs

---

## P3-002: Add Telemetry & Analytics

### Priority: P3 (Future)
### Estimated Effort: 1 week
### Risk Level: LOW

### Privacy-First Approach

- **Opt-in** by default
- No PII collection
- Local-first analytics
- Open source telemetry

### Metrics to Track

**Usage Metrics:**
- Commands used (frequency)
- Provider usage
- Tool usage
- Session duration
- Error rates

**Performance Metrics:**
- Response times
- Token usage
- Cache hit rates
- Memory usage

**Quality Metrics:**
- Test coverage trends
- Error recovery success
- User feedback

### Implementation

```typescript
// Lightweight, privacy-focused telemetry

interface TelemetryEvent {
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: Date;
}

class TelemetryService {
  private events: TelemetryEvent[] = [];
  private enabled = false;

  async track(event: string, properties?: Record<string, any>) {
    if (!this.enabled) return;

    this.events.push({
      event,
      properties: this.sanitizeProperties(properties),
      timestamp: new Date(),
    });

    // Store locally, optionally sync
    await this.persist();
  }

  private sanitizeProperties(props?: Record<string, any>): Record<string, any> {
    // Remove PII, sanitize values
    // ...
  }

  async getStats(): Promise<UsageStats> {
    // Aggregate local events
  }
}
```

---

## Long-term Roadmap (6-12 Months)

### Q1 2025: Stability & Performance
- Complete P0-P2 items
- Achieve 90%+ test coverage
- Performance benchmarks
- Security audit

### Q2 2025: Extensibility
- Plugin system (P3-001)
- Telemetry & Analytics (P3-002)
- Interactive improvements (P3-003)
- Code review mode (P3-004)

### Q3 2025: Enterprise Features
- Multi-user support (P3-006)
- Team collaboration
- RBAC (Role-Based Access Control)
- SSO integration

### Q4 2025: Advanced AI
- Fine-tuning capabilities
- Custom model training
- Advanced RAG (reranking, hybrid search)
- Agentic workflows

---

## Success Metrics

### Technical Metrics
- Test coverage > 90%
- Build time < 30s
- Startup time < 500ms
- Memory usage < 100MB

### User Metrics
- Active users growth 20% MoM
- Session duration avg 30min+
- Error rate < 1%
- User satisfaction > 4.5/5

### Business Metrics
- Plugin ecosystem growth
- Community contributions
- Documentation completeness
- Enterprise adoption

---

## Appendix: Technology Stack Evolution

### Current Stack
- TypeScript 5.6
- Node.js 16+
- better-sqlite3
- Keytar

### Proposed Additions
- Zod (validation)
- Docker
- Kubernetes (optional)
- Redis (caching, future)
- Prometheus (metrics, future)

---

**Document End**

*For questions or suggestions, contact the engineering team.*
