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
- **Multi-Provider**: Support for Ollama (local), OpenAI, Anthropic, and Gemini.
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