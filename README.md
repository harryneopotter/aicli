# AiCli

AiCli is an advanced, AI-powered command-line interface designed for developer productivity. It integrates secure agentic capabilities, allowing you to interact with LLMs (Ollama, OpenAI, Anthropic, Gemini) directly from your terminal with full context awareness.

## Key Features

### 🔒 Security First
- **Keychain Integration**: API keys are securely stored in your system's keychain (using `keytar`), not in plain text config files.
- **Session Encryption**: All session data (chat history, context) is encrypted at rest using AES-256-GCM.
- **Safe Execution**: Shell commands via `/exec` are whitelisted and validated to prevent accidental damage.

### 🤖 Agentic Capabilities
- **Agent Personas**: Switch between specialized agents (e.g., "Coder", "Writer") defined in markdown files.
- **Autonomous Tool Use**: Agents can autonomously execute commands, read/write files, and list directories to solve complex tasks.
- **Learning**: Train your agents with the `/train` command to create reusable playbooks and strategies.

### 🛠️ Core Functionality
- **Multi-Provider**: Support for Ollama (local), OpenAI, Anthropic, Gemini, and GLM-4 (ZhipuAI).
- **Context Awareness**: Automatically captures working directory, git status, and project type.
- **Session Management**: Save, load, search, and export your chat sessions.
- **Interactive Onboarding**: First-run setup wizard with skip option.

## Installation

```bash
git clone https://github.com/harryneopotter/aicli.git
cd aicli
npm install
npm run build
```

## First Run

On your first launch, AiCli will offer an interactive setup wizard:
- **Provider Selection**: Choose between Ollama (local), OpenAI, Anthropic, or Gemini.
- **API Key Setup**: Securely store your API keys in the system keychain.
- **Preferences**: Configure streaming and other UI options.

You can skip the wizard and run `aicli setup` later if you prefer.

## Usage

Start the CLI:
```bash
npm start
```

### Common Commands
- `/help`: Show available commands.
- `/agent [name]`: Switch agent persona (e.g., `/agent coder`).
- `/exec "command"`: Execute a shell command safely.
- `/train`: Train the agent on Q&A pairs to improve performance.
- `/config`: Manage settings and providers.

### Agent Calling (Tool Use)
The agent can autonomously use the following tools:
- `exec`: Run shell commands.
- `read_file`: Read file contents.
- `write_file`: Create or overwrite files.
- `list_files`: List directory contents.
- `search_code`: Semantic search through the codebase (requires `/index` first).
- `log_activity`: Log significant activities to project documentation.

### Project Memory (Auto-Docs)
AiCli maintains persistent project memory through automatic documentation:

**Initialize Documentation:**
```bash
/docs init
```

This creates a `.aicli` directory with:
- `design.md` - Project design and architecture
- `changelog.md` - Detailed changelog with timestamps
- `changes.md` - Quick index of recent changes
- `agent.md` - Rules and guidelines for the AI agent

**View Documentation:**
```bash
/docs view design      # View design documentation

## Model Context Protocol (MCP)

AiCli can connect to GLM‑4’s exclusive MCP servers to enable advanced capabilities:

- **Vision** – image analysis via a local stdio child process (`npx @z_ai/mcp-server`).
- **Web Search** – remote HTTP service (`https://api.z.ai/api/mcp/web_search_prime/mcp`).
- **Web Reader** – remote HTTP service (`https://api.z.ai/api/mcp/web_reader/mcp`).

When you select the **GLM‑4** provider, the CLI automatically connects to these MCP servers and registers the corresponding tools (`vision`, `web_search`, `web_reader`). You can also manage them manually:

```bash
/mcp connect      # start all GLM MCP servers
/mcp disconnect   # stop them
```

The tools are available like any other AiCli tool and can be invoked via the normal tool‑calling flow. Tests (`test_mcp.ts`) verify connection, tool listing, and execution.

/docs view changelog   # View full changelog
/docs view changes     # View recent changes
/docs view agent       # View agent rules
```

**How It Works:**
- The AI agent automatically receives project rules and recent changes in its context
- Agents can log activities using the `log_activity` tool
- Documentation persists across sessions for better context awareness

**Example - Agent Logging Activity:**
The agent can document its work automatically:
```xml
<tool_code>
{
  "name": "log_activity",
  "arguments": {
    "title": "Implemented User Authentication",
    "details": "Added JWT-based authentication with bcrypt password hashing",
    "files": ["src/auth/auth.service.ts", "src/auth/jwt.strategy.ts"]
  }
}
</tool_code>
```

### Semantic Code Search
Index your codebase for intelligent semantic search:
```bash
/index                 # Index the current project
```

Then the agent can use `search_code` tool to find relevant code snippets.

## Configuration

### API Key Management

AiCli supports **three methods** for providing API keys, with the following priority order:

1. **Environment Variables** (Highest Priority) - Best for development, CI/CD, and Docker
2. **System Keychain** - Secure storage via `keytar` (recommended for local use)
3. **Config File** - Legacy method (automatically migrated to keychain)

#### Using Environment Variables

Set environment variables for your preferred provider:

```bash
# OpenAI
export OPENAI_API_KEY="your-api-key-here"

# Anthropic
export ANTHROPIC_API_KEY="your-api-key-here"

# Gemini
export GEMINI_API_KEY="your-api-key-here"

# GLM-4 (ZhipuAI)
export GLM_API_KEY="your-api-key-here"
```

**Windows (PowerShell):**
```powershell
$env:GLM_API_KEY="your-api-key-here"
```

**Docker:**
```bash
docker run -e GLM_API_KEY="your-key" your-aicli-image
```

#### Using the Keychain (Recommended for Local Use)

During the interactive setup wizard or via commands:
```bash
/provider gemini
# Follow prompts to securely store API key in system keychain
```

### Configuration Files

Configuration is stored in `~/.aicli/config.json` (encrypted where applicable).
API keys stored via keychain are NOT in this file (they're in your system's secure keychain).

## Project Structure

```
aicli/
├── src/
│   ├── services/       # Core services (chat, context, security, etc.)
│   ├── storage/        # Session and data storage
│   ├── commands/       # Command handlers
│   ├── providers/      # LLM provider integrations
│   └── ui/             # Terminal UI rendering
├── agents/             # Agent persona definitions
└── dist/               # Compiled output
```

## Contributing

Contributions welcome! Fork the repo, create a branch, and submit a PR.

## License

MIT License
