# Warp CLI - AI Coding Assistant

A powerful, standalone CLI-based coding agent similar to Warp.dev with support for multiple LLM providers (local and cloud), persistent memory, context retrieval, and session management.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🤖 Multi-LLM Support
- **Ollama** - Run models locally (Llama, Mistral, etc.)
- **OpenAI** - GPT-4, GPT-3.5, and other models
- **Anthropic** - Claude 3.5 Sonnet and other Claude models
- **Google Gemini** - Gemini 1.5 Flash and Pro

### 💾 Persistent Sessions
- Save and load conversation sessions
- Full-text search across sessions
- Export sessions as JSON or Markdown
- Auto-save functionality

### 🧠 Smart Context Awareness
- Automatic Git repository detection
- Project type recognition (Node.js, Python, Rust, Go, etc.)
- Command history tracking
- Terminal output monitoring

### 🎨 Beautiful Terminal UI
- Warp-inspired interface
- Syntax highlighting
- Markdown rendering
- Streaming responses
- Color-coded messages

### ⚡ Powerful Commands
- Execute shell commands with validation
- Git integration
- Command explanation
- Error debugging
- Code suggestions
- Token usage tracking
- File context loading
- Conversation templates
- Configuration validation

### 🔒 Security Features
- Command validation and whitelisting
- Input sanitization
- SQL injection prevention
- Audit logging for all operations
- Credential masking in outputs
- Rate limiting for API calls
- Automatic retry with exponential backoff

### 📊 Token Management
- Real-time token usage tracking
- Cost estimation per provider
- Detailed usage reports
- Support for OpenAI, Anthropic, Gemini pricing
- Local models (Ollama) tracked as free

## Installation

### From NPM (Coming Soon)
```bash
npm install -g warp-cli
```

### From Source
```bash
# Clone the repository
git clone https://github.com/harryneopotter/aicli.git
cd aicli/warp-cli

# Install dependencies
npm install

# Build the project
npm run build

# Install globally
npm link
```

## Quick Start

### 1. Run Setup
```bash
warp setup
```

This will guide you through:
- Choosing your LLM provider
- Configuring API keys (if needed)
- Setting preferences

### 2. Start Chatting
```bash
warp
```

Or use the explicit chat command:
```bash
warp chat
```

### 3. Basic Usage
```
💬 chat > What is the command to list files?

🤖 ASSISTANT
The `ls` command lists files and directories. Here are common variations:

- `ls` - List files in current directory
- `ls -la` - List all files including hidden, with details
- `ls -lh` - List with human-readable sizes

💬 chat > /exec ls -la
```

## Configuration

### Interactive Setup
```bash
warp setup
```

### Manual Configuration
```bash
# View current configuration
warp config --list

# Set a value
warp config --set defaultProvider=ollama

# Get a specific value
warp config --get providers.ollama
```

### Configuration File
Configuration is stored in `~/.config/warp-cli/config.json`

Example configuration:
```json
{
  "defaultProvider": "ollama",
  "providers": {
    "ollama": {
      "endpoint": "http://localhost:11434",
      "model": "llama3.2"
    },
    "openai": {
      "apiKey": "sk-...",
      "model": "gpt-4-turbo-preview"
    },
    "anthropic": {
      "apiKey": "sk-ant-...",
      "model": "claude-3-5-sonnet-20241022"
    },
    "gemini": {
      "apiKey": "...",
      "model": "gemini-1.5-flash"
    }
  },
  "ui": {
    "theme": "dark",
    "markdown": true,
    "streaming": true
  },
  "context": {
    "maxHistory": 50,
    "includeGit": true,
    "includeFiles": true,
    "autoContext": true
  },
  "session": {
    "autosave": true,
    "directory": "~/.warp-cli/sessions"
  }
}
```

## Commands

### Chat Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help message |
| `/clear` | Clear screen |
| `/exit`, `/quit` | Exit application |
| `/new [name]` | Create new session |
| `/save [name]` | Save current session |
| `/load <id>` | Load a session |
| `/list` | List all sessions |
| `/delete <id>` | Delete a session |
| `/search <query>` | Search sessions |

### Configuration Commands

| Command | Description |
|---------|-------------|
| `/config` | Show configuration |
| `/provider <name>` | Switch LLM provider |
| `/model <name>` | Set model name |
| `/context` | Show current context |

### Execution Commands

| Command | Description |
|---------|-------------|
| `/exec <command>` | Execute shell command |
| `/git <args>` | Execute git command |
| `/explain <command>` | Explain a command |
| `/suggest <task>` | Suggest command for task |

### Utility Commands

| Command | Description |
|---------|-------------|
| `/stats` | Show session statistics |
| `/export <id> [format]` | Export session (json/markdown) |
| `/usage [detailed]` | Show token usage and cost estimates |
| `/files <pattern>` | Load files into conversation context |
| `/template [name]` | List or use conversation templates |
| `/validate` | Validate current configuration |

## CLI Commands

### Chat
```bash
# Start with default provider
warp chat

# Start with specific provider
warp chat --provider openai

# Start with specific model
warp chat --model gpt-4

# Resume a session
warp chat --session <id>
```

### Configuration Management
```bash
# List configuration
warp config --list

# Set a value
warp config --set key=value

# Get a value
warp config --get key

# Reset to defaults
warp config --reset
```

### Session Management
```bash
# List all sessions
warp sessions --list

# Delete a session
warp sessions --delete <id>

# Export a session
warp sessions --export <id> --format json
```

## Provider Setup

### Ollama (Local)

1. Install Ollama: https://ollama.ai
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. Configure Warp CLI:
   ```bash
   warp setup
   # Choose "Ollama (Local)"
   # Set endpoint: http://localhost:11434
   # Set model: llama3.2
   ```

### OpenAI

1. Get API key from: https://platform.openai.com/api-keys
2. Configure:
   ```bash
   warp setup
   # Choose "OpenAI"
   # Enter your API key
   # Choose model (e.g., gpt-4-turbo-preview)
   ```

### Anthropic (Claude)

1. Get API key from: https://console.anthropic.com/
2. Configure:
   ```bash
   warp setup
   # Choose "Anthropic (Claude)"
   # Enter your API key
   # Choose model (e.g., claude-3-5-sonnet-20241022)
   ```

### Google Gemini

1. Get API key from: https://makersuite.google.com/app/apikey
2. Configure:
   ```bash
   warp setup
   # Choose "Google Gemini"
   # Enter your API key
   # Choose model (e.g., gemini-1.5-flash)
   ```

## Environment Variables

You can also configure providers using environment variables:

```bash
# OpenAI
export OPENAI_API_KEY=sk-...

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# Gemini
export GEMINI_API_KEY=...
```

Create a `.env` file in `~/.warp-cli/`:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

## Examples

### Basic Conversation
```
💬 chat > How do I create a new Git branch?

🤖 ASSISTANT
To create a new Git branch, use:

```bash
git branch <branch-name>
git checkout <branch-name>
```

Or use the shorthand:
```bash
git checkout -b <branch-name>
```

This creates and switches to the new branch in one command.
```

### Execute Commands
```
💬 chat > /exec git status

📦 Command: git status

On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

### Explain Commands
```
💬 chat > /explain rm -rf /

🤖 ASSISTANT
⚠️ WARNING: This is a DANGEROUS command!

`rm -rf /` will:
1. Remove (`rm`) files recursively (`-r`)
2. Force deletion without prompts (`-f`)
3. Starting from root directory (`/`)

This will DELETE YOUR ENTIRE SYSTEM!

Never run this command! It's often used as an example of what NOT to do.
```

### Session Management
```
💬 chat > /save my-project-session
✅ Session saved: my-project-session (ID: a1b2c3d4)

💬 chat > /list
╔══════════╤═══════════════════╤══════════════════╤══════════════════╗
║ ID       │ Name              │ Created          │ Updated          ║
╟──────────┼───────────────────┼──────────────────┼──────────────────╢
║ a1b2c3d4 │ my-project-session│ Jan 15, 2024 ... │ Jan 15, 2024 ... ║
╚══════════╧═══════════════════╧══════════════════╧══════════════════╝
```

### Token Usage Tracking
```
💬 chat > /usage detailed

📊 Token Usage Report
════════════════════════════════════════════════════════════

📈 Overall Statistics:
   Total Requests: 42
   Total Tokens: 125,340
   Estimated Cost: $0.3756
   Providers Used: 2

🔢 By Provider:
────────────────────────────────────────────────────────────

openai:gpt-4-turbo-preview:
   Requests: 25
   Input Tokens: 45,230
   Output Tokens: 35,120
   Total Tokens: 80,350
   Cost: $0.3012
   First Used: Jan 15, 2024 10:30 AM
   Last Used: Jan 15, 2024 3:45 PM
   Avg Tokens/Request: 3,214

anthropic:claude-3-5-sonnet-20241022:
   Requests: 17
   Input Tokens: 28,990
   Output Tokens: 16,000
   Total Tokens: 44,990
   Cost: $0.0744
```

### File Context Loading
```
💬 chat > /files src/**/*.ts

Loading files matching: src/**/*.ts

✅ Loaded 8 file(s):
  • src/cli.ts (145 lines)
  • src/types.ts (89 lines)
  • src/commands/handlers.ts (437 lines)
  • src/services/chat.service.ts (184 lines)
  • src/services/config.service.ts (142 lines)
  • src/services/context.service.ts (305 lines)
  • src/services/session.service.ts (223 lines)
  • src/storage/session.storage.ts (267 lines)

Total: 1,792 lines, 89.6 KB

ℹ Files loaded into conversation context. You can now ask questions about them.

💬 chat > Can you review the chat service for potential improvements?
```

### Conversation Templates
```
💬 chat > /template

📝 Available Templates:

DEBUGGING:
  • Debug Error - Get help debugging an error message
  • Fix Bug - Fix a specific bug in code

DEVELOPMENT:
  • Implement Feature - Implement a new feature
  • API Integration - Help integrating with an API

IMPROVEMENT:
  • Refactor Code - Get suggestions for improving code
  • Simplify Code - Make code simpler and more readable

TESTING:
  • Generate Tests - Generate unit tests for code

💬 chat > /template debug

📝 Template: Debug Error
Description: Get help debugging an error message

This template requires the following variables:
  • {error}
  • {code}

Please fill in the variables and use the template in your next message.

Template:
I have an error in my code. Here's the error message:

{error}

And here's the relevant code:

{code}

Can you help me understand what's causing this error and how to fix it?
```

### Configuration Validation
```
💬 chat > /validate

✓ Configuration is valid!
```

## Advanced Features

### Context Awareness

Warp CLI automatically detects and includes:
- Current working directory
- Git repository info (branch, status, remotes)
- Project type (package.json, Cargo.toml, etc.)
- Recent commands and outputs
- System information (OS, shell)

### Streaming Responses

Enable streaming for real-time responses:
```bash
warp config --set ui.streaming=true
```

### Markdown Support

Responses are rendered with full markdown support:
- Code blocks with syntax highlighting
- Lists and tables
- Bold, italic, and other formatting

## Troubleshooting

### Ollama Connection Failed
```bash
# Check if Ollama is running
ollama list

# Start Ollama if needed
ollama serve
```

### API Key Issues
```bash
# Verify your API key is set
warp config --get providers.<provider>.apiKey

# Re-run setup if needed
warp setup
```

### Session Storage Issues
```bash
# Check session directory
ls ~/.warp-cli/sessions/

# Reset if corrupted
rm ~/.warp-cli/sessions/sessions.db
warp chat  # Will create new database
```

## Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Watch Mode
```bash
npm run watch
```

### Run Tests
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Architecture

```
warp-cli/
├── src/
│   ├── cli.ts              # Main CLI entry point
│   ├── types.ts            # TypeScript types
│   ├── commands/           # Command handlers
│   │   └── handlers.ts
│   ├── providers/          # LLM providers
│   │   ├── base.provider.ts
│   │   ├── ollama.provider.ts
│   │   ├── openai.provider.ts (with rate limiting)
│   │   ├── anthropic.provider.ts (with rate limiting)
│   │   ├── gemini.provider.ts (with rate limiting)
│   │   └── index.ts
│   ├── services/           # Core services
│   │   ├── chat.service.ts        # Chat management with token tracking
│   │   ├── config.service.ts      # Configuration with validation
│   │   ├── context.service.ts     # Context awareness
│   │   ├── session.service.ts     # Session management
│   │   ├── audit.service.ts       # Security audit logging
│   │   ├── token-tracker.service.ts  # Token usage tracking
│   │   └── file-context.service.ts   # File loading
│   ├── storage/            # Data persistence
│   │   └── session.storage.ts (optimized queries)
│   ├── templates/          # Conversation templates
│   │   └── conversation-templates.ts
│   ├── utils/              # Utilities
│   │   ├── security.ts            # Input validation & sanitization
│   │   ├── rate-limiter.ts        # Rate limiting & retry logic
│   │   ├── error-handler.ts       # Enhanced error handling
│   │   └── config-validator.ts    # Configuration validation
│   └── ui/                 # Terminal UI
│       └── renderer.ts
├── .github/
│   ├── workflows/
│   │   └── ci.yml          # CI/CD pipeline
│   └── ISSUE_TEMPLATE/     # Issue templates
├── docs/                   # Documentation
│   ├── SECURITY_COMPLIANCE.md
│   ├── TEST_REPORT.md
│   ├── WINDOWS_COMPATIBILITY.md
│   └── IMPROVEMENTS.md
├── package.json
├── tsconfig.json
├── .nvmrc                  # Node version pinning
├── .editorconfig           # Editor configuration
├── CONTRIBUTING.md         # Contribution guidelines
└── README.md
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: https://github.com/harryneopotter/aicli/issues
- Documentation: https://github.com/harryneopotter/aicli/wiki

## Roadmap

- [x] File context loading
- [x] Token usage tracking
- [x] Conversation templates
- [x] Security enhancements (command validation, audit logging)
- [x] Rate limiting and retry logic
- [ ] Plugin system for extensions
- [ ] Code analysis tools
- [ ] Multi-language support
- [ ] Custom themes
- [ ] Voice input support
- [ ] Integration with popular IDEs

## Acknowledgments

- Inspired by Warp.dev terminal
- Built with TypeScript and Node.js
- Uses multiple LLM providers for flexibility

---

Made with ❤️ by the AI CLI Team
