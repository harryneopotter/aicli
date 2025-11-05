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
- Execute shell commands
- Git integration
- Command explanation
- Error debugging
- Code suggestions

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
│   │   ├── openai.provider.ts
│   │   ├── anthropic.provider.ts
│   │   ├── gemini.provider.ts
│   │   └── index.ts
│   ├── services/           # Core services
│   │   ├── chat.service.ts
│   │   ├── config.service.ts
│   │   ├── context.service.ts
│   │   └── session.service.ts
│   ├── storage/            # Data persistence
│   │   └── session.storage.ts
│   └── ui/                 # Terminal UI
│       └── renderer.ts
├── package.json
├── tsconfig.json
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

- [ ] Plugin system for extensions
- [ ] File context loading
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
