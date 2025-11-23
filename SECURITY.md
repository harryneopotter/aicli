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

### 5. Input Sanitization & Redaction
- **PII Redaction**: The `ErrorHandler` automatically strips sensitive information from error logs and user outputs, including:
  - API Keys (OpenAI, Anthropic, Gemini, GLM)
  - Absolute file paths (replaced with relative paths or placeholders)
  - IP addresses
  - Passwords and auth tokens
- **Zod Validation**: All external inputs (tool arguments, configuration files) are validated against strict Zod schemas to ensure type safety and prevent malformed data injection.

## Reporting Security Issues

Please report security vulnerabilities to: security@aicli.dev

Do NOT open public GitHub issues for security vulnerabilities.