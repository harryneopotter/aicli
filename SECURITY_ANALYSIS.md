# COMPREHENSIVE SECURITY ANALYSIS REPORT
## AI CLI / Warp-CLI / Tabby AI Agent

### CRITICAL SEVERITY ISSUES

#### 1. Arbitrary Command Execution via Shell Injection
**Location:** `/home/user/aicli/warp-cli/src/services/context.service.ts:206-230`
**Severity:** CRITICAL
**CWE:** CWE-78 (OS Command Injection)

**Code:**
```typescript
async executeCommand(command: string): Promise<{ output: string; error?: string }> {
  this.addCommand(command);
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });
```

**Issues:**
- Direct use of `execAsync()` with user-supplied command without any validation or sanitization
- Command is passed directly from user input through handlers.ts:288 (`await chatService.executeCommand(command)`)
- User can inject arbitrary shell commands (e.g., `; rm -rf /`, `| cat ~/.ssh/id_rsa`)
- The `/exec` command in handlers.ts allows direct command execution without restrictions

**Exploit Scenario:**
User executes: `/exec; cat /etc/passwd`
The command gets passed directly to execAsync() which passes it to shell, exposing sensitive files.

**Remediation:**
- Use `execFile()` instead of `exec()` with array of arguments (no shell interpretation)
- Implement whitelist of allowed commands
- Validate command syntax before execution
- Use proper command parsing instead of shell string interpolation

---

#### 2. API Key Exposed in URL Query String
**Location:** `/home/user/aicli/warp-cli/src/providers/gemini.provider.ts:16, 73`
**Severity:** CRITICAL
**CWE:** CWE-598 (Use of GET Request with Sensitive Query Strings)

**Code:**
```typescript
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveConfig.apiKey}`;
const response = await fetch(apiUrl, {
  method: 'POST',
  ...
});
```

**Issues:**
- API key is embedded directly in URL as query parameter
- URLs are logged in HTTP logs, browser history, proxy logs, etc.
- API key appears in plaintext in network traffic
- Easy to extract from debug logs or network captures

**Exploit Scenario:**
1. Attacker intercepts network traffic → captures API key in URL
2. Attacker accesses browser history → sees API key in URLs
3. Attacker reviews server logs → finds API key in HTTP logs

**Remediation:**
- Move API key to HTTP Authorization header: `Authorization: Bearer ${apiKey}`
- Use POST request with key in body, not URL
- Sanitize logs to never display URLs with sensitive parameters

---

#### 3. Hardcoded and Plaintext API Key Storage
**Location:** 
- `/home/user/aicli/warp-cli/src/services/config.service.ts` (stores in config)
- `/home/user/aicli/warp-cli/src/cli.ts:319-337` (setup prompts for apiKey)
- `/home/user/aicli/warp-cli/.env.example` (shows API key example)

**Severity:** CRITICAL
**CWE:** CWE-798 (Use of Hard-Coded Credentials), CWE-320 (Key Management Errors)

**Issues:**
- API keys stored in plaintext in config files using `conf` package (stored in user's home directory)
- `.env` files contain example API keys
- Configuration exported/imported without encryption (cli.ts:206-223)
- `process.env` contains all environment variables including secrets (session.service.ts:128)
- No encryption of sensitive data at rest

**Exploit Scenario:**
1. Attacker gains file system access to ~/.config/warp-cli
2. Reads plaintext API keys from config JSON
3. Uses API keys for fraudulent requests, API abuse
4. Attacker reads .env file with API key examples

**Remediation:**
- Use OS keychain/credential store (KeyChain on macOS, Credential Manager on Windows, Secret Service on Linux)
- Encrypt sensitive config at rest
- Never store API keys in plaintext
- Use separate secrets management solution
- Do not expose full process.env in session context
- Never include example API keys in .env.example

---

### HIGH SEVERITY ISSUES

#### 4. Environment Variable Secrets Leak to Session Storage
**Location:** `/home/user/aicli/warp-cli/src/services/session.service.ts:128`
**Severity:** HIGH
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

**Code:**
```typescript
environment: process.env as Record<string, string>
```

**Issues:**
- Entire process.env dumped into session storage
- Includes DATABASE_URL, GEMINI_API_KEY, BRAVE_API_KEY, all API keys
- Secrets stored in SQLite database
- Exposed when sessions are exported

**Exploit Scenario:**
- Attacker gains access to session database
- Extracts all environment variables including API keys
- Exports session to file and reads all secrets in plaintext

**Remediation:**
- Filter environment variables to exclude sensitive ones
- Implement allowlist of safe environment variables
- Never store credentials in session context
- Sanitize environment before session export

---

#### 5. MCP Server Process Spawning Without Output Sanitization
**Location:** `/home/user/aicli/tabby-ai-agent/src/services/mcp-client.service.ts:238-303`
**Severity:** HIGH
**CWE:** CWE-94 (Improper Control of Generation of Code)

**Issues:**
- Child processes spawned without proper stderr/stdout sanitization
- Process stderr is logged with `.on('data')` handler at line 301-303
- MCP servers can output malicious content that gets logged
- Environment variables passed unsanitized to child processes
- BRAVE_API_KEY and DATABASE_URL passed directly to spawn

**Exploit Scenario:**
- Malicious MCP server outputs crafted content designed to escape terminal
- Could cause XSS if terminal output is rendered in HTML
- API keys passed in env vars could be captured by subprocess

**Remediation:**
- Sanitize stderr/stdout from child processes
- Validate environment variables before passing to spawn
- Use allowlist for environment variables
- Never pass API keys as env vars to untrusted processes
- Limit process permissions using seccomp/AppArmor

---

#### 6. Unsafe JSON Parsing Without Validation
**Location:**
- `/home/user/aicli/warp-cli/src/services/context.service.ts:126` (parsePackageJson)
- `/home/user/aicli/warp-cli/src/storage/session.storage.ts:175, 184` (loading sessions)
- `/home/user/aicli/warp-cli/src/services/config.service.ts:91` (importConfig)

**Severity:** HIGH
**CWE:** CWE-502 (Deserialization of Untrusted Data)

**Code:**
```typescript
const pkg = JSON.parse(content);
const metadata: row.metadata ? JSON.parse(row.metadata) : undefined
const importedConfig = JSON.parse(configString);
```

**Issues:**
- No schema validation after JSON.parse
- Malformed JSON in session data crashes application
- No bounds checking on parsed data size
- JSON from database could be corrupted or malicious
- User can import arbitrary JSON configuration

**Exploit Scenario:**
1. Attacker crafts malicious JSON and saves to session metadata
2. Application crashes when loading session due to unexpected structure
3. Alternatively, malicious config imported overwrites settings

**Remediation:**
- Use JSON schema validation library (e.g., joi, yup, zod)
- Validate parsed objects against expected schema
- Handle parse errors gracefully with fallbacks
- Set limits on JSON size before parsing
- Sanitize imported configurations

---

#### 7. Tool Name Injection in MCP Tool Execution
**Location:** `/home/user/aicli/tabby-ai-agent/src/services/ai-agent.service.ts:401-434`
**Severity:** HIGH
**CWE:** CWE-89 (SQL Injection) - applies to tool name as well

**Code:**
```typescript
async executeTool(toolName: string, parameters: any, preferredServer?: string): Promise<any> {
  // ...
  const tool = tools.tools?.find((t: any) => t.name === toolName)
  // ...
  const result = await server.client.callTool({
    name: toolName,
    arguments: parameters
  })
```

**Issues:**
- Tool names extracted from AI response via regex pattern matching
- No validation that tool name matches one of available tools before execution
- Tool parameters also extracted via regex without validation
- Could execute unintended tools or with malicious parameters

**Exploit Scenario:**
1. AI model prompted to return tool calls could be tricked by user
2. Attacker crafts prompt: "Call tool: `rm -rf /` with params: {path: /}"
3. Tool extraction regex matches malicious pattern
4. Unvalidated tool gets executed

**Remediation:**
- Validate tool name against whitelist of available tools before execution
- Validate parameters against tool's input schema
- Disable MCP tool execution by default
- Require user confirmation before executing tools
- Log all tool execution attempts

---

#### 8. Secrets Exposed Through Error Messages
**Location:** Multiple error handling locations
**Severity:** HIGH
**CWE:** CWE-209 (Information Exposure Through an Error Message)

**Issues:**
- Error messages include full stack traces
- API endpoints logged with embedded API keys
- Network errors expose request details
- Chat service errors expose provider information

**Exploit Scenario:**
- Error thrown from gemini.provider.ts line 51 includes apiUrl with API key
- Error logged and exposed to user or in log files
- Attacker reads error logs and extracts API key

**Remediation:**
- Never include sensitive data in error messages
- Use error codes instead of detailed messages
- Sanitize URLs before logging
- Log full details only to secure audit logs, not to users
- Implement proper error handling with different messages for users vs. logs

---

### MEDIUM SEVERITY ISSUES

#### 9. FTS Search Query Without Proper Input Escaping
**Location:** `/home/user/aicli/warp-cli/src/storage/session.storage.ts:229`
**Severity:** MEDIUM
**CWE:** CWE-89 (SQL Injection)

**Code:**
```typescript
const rows: any[] = await this.allAsync(
  `SELECT s.id, s.name, s.created, s.updated, s.context, s.metadata
   FROM sessions s
   JOIN sessions_fts fts ON s.rowid = fts.rowid
   WHERE sessions_fts MATCH ?
   ORDER BY rank`,
  [query]
);
```

**Issues:**
- While parameterized query is used (good), FTS MATCH syntax is case-sensitive
- Special FTS operators could cause unexpected results: `AND`, `OR`, `NOT`, `NEAR`, `*`
- Query like `"test" AND "admin"` could modify search logic
- User input could craft FTS queries to bypass intended search

**Exploit Scenario:**
User searches for `"password" OR "1"="1` to find all sessions containing any data

**Remediation:**
- Escape FTS special characters in user input
- Use FTS table function properly with options for phrase search
- Validate search query format
- Implement search query sanitization

---

#### 10. Missing Input Validation on Shell Command Execution
**Location:** `/home/user/aicli/warp-cli/src/commands/handlers.ts:283-289`
**Severity:** MEDIUM
**CWE:** CWE-78 (Improper Neutralization of Special Elements used in an OS Command)

**Code:**
```typescript
private async handleExec(command: string): Promise<void> {
  if (!command) {
    throw new Error('Please provide a command to execute.');
  }
  await chatService.executeCommand(command);
}
```

**Issues:**
- No validation of command syntax
- No whitelist of allowed commands
- No restrictions on what commands can be executed
- User can delete files, access sensitive data, etc.

**Remediation:**
- Implement command whitelist/blacklist
- Parse and validate command structure
- Restrict to safe commands only (e.g., git, npm, etc.)
- Use execFile instead of exec

---

#### 11. Race Condition in Session Autosave
**Location:** `/home/user/aicli/warp-cli/src/services/session.service.ts:132-143`
**Severity:** MEDIUM
**CWE:** CWE-362 (Concurrent Execution using Shared Resource)

**Code:**
```typescript
this.autosaveInterval = setInterval(async () => {
  if (this.currentSession && this.currentSession.messages.length > 0) {
    try {
      await this.saveCurrentSession();
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  }
}, 30000);
```

**Issues:**
- No locking mechanism for concurrent access to session
- Multiple saves could happen simultaneously
- Session could be modified while being saved
- Messages could be lost if save fails

**Remediation:**
- Implement mutex/lock for session save operations
- Queue save operations instead of fire-and-forget
- Verify save completion before allowing further modifications
- Use transactional database writes

---

#### 12. Unsafe HTML Rendering (Potential XSS)
**Location:** `/home/user/aicli/tabby-ai-agent/src/plugin.ts:14` (good)
**Severity:** MEDIUM (Well-handled but potential issues)

**Issues:**
- While sanitizeHtml is used in cleanInput(), it's not used everywhere
- Terminal output rendered without sanitization
- Tool results integrated without sanitization (ai-agent.service.ts:451-467)
- Response from AI models rendered directly to terminal

**Exploit Scenario:**
- AI model returns HTML content: `<img src=x onerror="stealData()">`
- If rendered as HTML (future web frontend), could execute JavaScript
- Terminal escape codes could be abused

**Remediation:**
- Sanitize all user-facing output
- Use strict content security policy
- Escape HTML entities by default
- Validate all external content

---

#### 13. Missing .env Files in .gitignore
**Location:** `/home/user/aicli/.gitignore`
**Severity:** MEDIUM
**CWE:** CWE-540 (Inclusion of Sensitive Information in Source Code)

**Issues:**
- .env files not explicitly ignored (relies on .env.example)
- `*.env` pattern would catch .env.example too
- If developer creates .env locally, it could be accidentally committed
- No protection for .env.local files

**Remediation:**
- Add explicit .env and .env.local to .gitignore
- Use .env.example for examples
- Use pre-commit hooks to prevent secrets in commits
- Audit git history for accidentally committed secrets

---

#### 14. Unencrypted HTTP Communication (Ollama)
**Location:** `/home/user/aicli/warp-cli/src/providers/ollama.provider.ts:10`
**Severity:** MEDIUM
**CWE:** CWE-295 (Improper Certificate Validation)

**Code:**
```typescript
const endpoint = effectiveConfig.endpoint || 'http://localhost:11434';
```

**Issues:**
- Default Ollama endpoint is HTTP (unencrypted)
- While localhost traffic is less critical, data is still unencrypted
- No certificate validation
- Prompts sent in cleartext to LLM

**Exploit Scenario:**
- Attacker on network captures HTTP traffic
- Reads all AI prompts, responses, context data
- Reveals sensitive information shared with AI

**Remediation:**
- Use HTTPS by default
- Implement certificate validation
- Add warning if using unencrypted connection
- Support mTLS for Ollama

---

#### 15. Process Environment Variables Not Sanitized
**Location:** `/home/user/aicli/tabby-ai-agent/src/services/mcp-client.service.ts:232-235`
**Severity:** MEDIUM
**CWE:** CWE-532 (Insertion of Sensitive Information)

**Code:**
```typescript
const env = {
  ...process.env,
  ...(server.env || {})
}
```

**Issues:**
- Full process.env spread into subprocess environment
- All parent process secrets inherited by child processes
- Child process could log or expose environment
- No filtering of sensitive variables

**Remediation:**
- Create clean environment with only necessary variables
- Filter out API_KEY, PASSWORD, TOKEN, SECRET patterns
- Use allowlist of safe environment variables
- Pass credentials only when necessary

---

### LOW SEVERITY ISSUES

#### 16. Verbose Error Information Disclosure
**Location:** Multiple error handlers
**Severity:** LOW
**CWE:** CWE-209 (Information Exposure Through Error Message)

**Code Examples:**
```typescript
throw new Error(`Anthropic API error: ${error.message}`);
throw new Error(`Failed to call Gemini API: ${error.message}`);
```

**Issues:**
- Stack traces potentially exposed
- Third-party error details revealed
- API endpoints and provider details logged

**Remediation:**
- Use error codes instead of detailed messages
- Log detailed errors separately for debugging
- Show generic messages to users

---

#### 17. MCP Server Command Validation Too Weak
**Location:** `/home/user/aicli/tabby-ai-agent/src/services/mcp-client.service.ts:706-712`
**Severity:** LOW
**CWE:** CWE-94 (Improper Control)

**Code:**
```typescript
private validateServerConfig(config: MCPServerConfig) {
  const ALLOWED_COMMANDS = new Set(['npx', 'node']);
  if (!ALLOWED_COMMANDS.has(config.command)) {
    throw new Error(`Disallowed command: ${config.command}`);
  }
}
```

**Issues:**
- Only checks command name, not full path
- `npx` could be hijacked from PATH
- Args array not validated for dangerous flags
- Could still spawn arbitrary processes via npx arguments

**Exploit Scenario:**
Config: `{command: 'npx', args: ['malicious-package']}`
Spawns unvetted npm package

**Remediation:**
- Use full absolute paths to executables
- Validate all arguments in args array
- Whitelist specific versions of packages
- Run MCP servers in isolated containers/sandboxes

---

#### 18. No Session Expiration or TTL
**Location:** `/home/user/aicli/warp-cli/src/services/session.service.ts`
**Severity:** LOW
**CWE:** CWE-613 (Insufficient Session Expiration)

**Issues:**
- Sessions stored indefinitely
- No automatic cleanup of old sessions
- No session timeout mechanism
- Sensitive data persists forever

**Remediation:**
- Implement session TTL (e.g., 90 days)
- Add automatic cleanup of expired sessions
- Add session timeout on inactivity
- Encrypt sensitive session data

---

#### 19. SQLite Database Permissions Not Verified
**Location:** `/home/user/aicli/warp-cli/src/storage/session.storage.ts:11`
**Severity:** LOW
**CWE:** CWE-276 (Incorrect Default Permissions)

**Code:**
```typescript
this.dbPath = path.join(storagePath, 'sessions.db');
// Created with fs.mkdirSync with default permissions
fs.mkdirSync(dir, { recursive: true });
```

**Issues:**
- SQLite database created with default permissions
- Could be world-readable depending on umask
- Other users on system could read sessions
- No encryption at database level

**Remediation:**
- Create directory with restrictive permissions: `0o700`
- Encrypt database file
- Set proper file permissions on database file
- Use `chmod 600` for database files

---

#### 20. No Rate Limiting on API Calls
**Location:** All provider implementations
**Severity:** LOW
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Issues:**
- No rate limiting on OpenAI, Anthropic, Gemini API calls
- Could be used for denial of service
- No request throttling
- API quota could be exhausted

**Remediation:**
- Implement rate limiting per provider
- Add request queuing
- Monitor API usage and alert on anomalies
- Set API call budgets

---

## DEPENDENCY VULNERABILITIES SUMMARY

**Review of package.json files:**

**Warp-CLI Dependencies with Potential Issues:**
- `node-fetch@2.7.0` - Old version, consider updating to 3.x for better security
- `sqlite3@5.1.7` - Check for known vulnerabilities
- `conf@10.2.0` - Stores config in plaintext, not suitable for secrets

**Tabby-AI-Agent Dependencies:**
- `@modelcontextprotocol/sdk@0.5.0` - Relatively new, check security advisories
- `sanitize-html@2.11.0` - Good, actively maintained

**Recommendation:**
- Run `npm audit` regularly
- Use Snyk or similar SCA tool
- Keep dependencies updated
- Monitor npm security advisories

---

## SUMMARY BY CATEGORY

### Authentication/Authorization
- No authentication implemented
- Anyone with file access can read API keys
- No API key validation or rotation mechanism
- Hardcoded API keys in examples

### Input Validation
- CRITICAL: Command injection via exec()
- Missing validation on search queries
- No schema validation on JSON parsing
- Missing validation on MCP tool parameters

### Cryptography/Secrets
- CRITICAL: API keys exposed in URLs
- CRITICAL: API keys stored in plaintext
- No encryption of configuration data
- No encryption of session data
- Full environment variables exposed

### Code Execution
- CRITICAL: Arbitrary command execution
- Unsafe child process spawning
- Unvalidated MCP tool execution

### Data Storage
- Plaintext API keys in config files
- Unencrypted session database
- No data retention policy
- Secrets in log files

### Network Security
- Unencrypted HTTP (Ollama)
- No certificate pinning
- API keys in URLs logged in transit

### Error Handling
- Verbose error messages expose information
- Stack traces potentially logged
- No error sanitization

---

## REMEDIATION PRIORITY

### IMMEDIATE (Exploit Risk High)
1. Fix command injection in context.service.ts (CRITICAL)
2. Remove API keys from URLs (CRITICAL)
3. Implement secure credential storage (CRITICAL)

### SHORT-TERM (High Priority)
4. Add input validation on all commands
5. Sanitize environment variables
6. Add error message sanitization
7. Implement JSON schema validation
8. Add MCP tool execution validation

### MEDIUM-TERM
9. Implement encryption at rest
10. Add rate limiting
11. Implement session expiration
12. Add audit logging
13. Upgrade dependencies

### LONG-TERM
14. Implement HTTPS/mTLS
15. Add authentication layer
16. Implement secrets management
17. Add comprehensive security testing
18. Implement container isolation for MCP servers

