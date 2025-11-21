# 🚀 AI CLI - Complete AI Coding Assistant Suite

> **Professional AI-powered terminal assistant with multi-provider support, beautiful UI, and intelligent context awareness**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)

---

## 📚 Table of Contents

- [Overview](#overview)
- [Projects](#projects)
- [Key Features](#key-features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Usage Examples](#usage-examples)
- [Security Features](#security-features)
- [Configuration](#configuration)
- [Advanced Features](#advanced-features)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

---

## 🎯 Overview

**AI CLI** is a comprehensive suite of AI-powered coding assistants designed for developers who want intelligent, context-aware help directly in their terminal. Built with TypeScript, featuring beautiful gradients, syntax highlighting, and seamless integration with modern terminal emulators like Tabby.

### Why AI CLI?

- ✨ **Multi-Provider Support** - Use Ollama (local), OpenAI, Anthropic Claude, or Google Gemini
- 🎨 **Beautiful UI** - Gradient colors, syntax highlighting, and Warp.dev-inspired design
- 🔒 **Security First** - OS keychain integration, encrypted sessions, command validation
- 💾 **Persistent Sessions** - Full-text search, export to JSON/Markdown, auto-save
- 🧠 **Context-Aware** - Understands your git status, project type, and command history
- 🔌 **Extensible** - Plugin system, custom themes, MCP integration
- ⚡ **Fast** - Streaming responses, local model support, intelligent caching

---

## 📦 Projects

This repository contains **two complementary tools**:

### 1. 🖥️ Warp CLI - Standalone Terminal Assistant

**Location:** `/warp-cli`

A complete, standalone CLI application that brings AI directly to your terminal.

**Perfect for:**
- Quick AI consultations while coding
- Command explanations and suggestions
- Code reviews and debugging
- Learning new technologies
- Shell scripting help

**Run anywhere:**
```bash
warp chat
# Works in any terminal: iTerm, Alacritty, Tabby, Windows Terminal, etc.
```

---

### 2. 🔌 Tabby AI Agent - Terminal Plugin

**Location:** `/tabby-ai-agent`

Deep integration plugin for [Tabby Terminal](https://tabby.sh) with MCP (Model Context Protocol) support.

**Perfect for:**
- Seamless AI + shell mixing (no mode switching)
- Smart command detection
- Inline AI suggestions
- MCP tool integration
- Terminal automation

**Smart modes:**
- `\ai` - AI mode (everything goes to AI)
- `\shell` - Shell mode (pure terminal)
- `\smart` - Auto-detect (default)

---

## ✨ Key Features

### 🎨 Beautiful Terminal UI

- **Gradient Colors** - Cyan-to-purple gradients inspired by Warp.dev
- **Syntax Highlighting** - Automatic language detection with professional highlighting
- **Block-Based Output** - Clear visual separation of commands, output, and AI responses
- **Rich Markdown** - Headers, lists, links, code blocks all beautifully rendered
- **Tabby Optimized** - Specifically tuned for modern terminals

### 🤖 AI Capabilities

#### Multi-Provider Support

| Provider | Models | Type | Best For |
|----------|--------|------|----------|
| **Ollama** | llama3.2, codellama, mistral | Local | Privacy, no cost, offline |
| **OpenAI** | GPT-4, GPT-3.5 | Cloud | General purpose, fast |
| **Anthropic** | Claude 3.5 Sonnet, Opus | Cloud | Complex reasoning, long context |
| **Google** | Gemini 1.5 Pro, Flash | Cloud | Multimodal, cost-effective |

#### Intelligent Features

- **Context Awareness** - Knows your current directory, git status, project type
- **Command History** - Tracks recent commands and outputs
- **Smart Suggestions** - Recommends commands based on your intent
- **Error Analysis** - Explains and suggests fixes for errors
- **Code Review** - Analyzes code quality and suggests improvements
- **Diff Viewer** - Shows code changes before applying

### 💾 Session Management

- **Auto-Save** - Sessions saved every 30 seconds
- **Full-Text Search** - Find past conversations instantly (SQLite FTS5)
- **Export** - Save sessions as JSON or Markdown
- **Session Templates** - Pre-configured sessions for different tasks
- **Statistics** - Track usage, tokens, and costs
- **Session Sharing** - Share sessions with team (read-only links)

### 🔒 Enterprise-Grade Security

- **OS Keychain Integration** - API keys stored securely (Keychain/Credential Manager/Secret Service)
- **Encrypted Sessions** - AES-256-GCM encryption for session data
- **Command Validation** - Whitelist-based command execution
- **Input Sanitization** - Protection against injection attacks
- **Secrets Filtering** - API keys never logged or displayed
- **Audit Logging** - Complete activity tracking
- **Session Expiration** - 90-day TTL with auto-cleanup
- **Rate Limiting** - Prevents API abuse

### 🔧 Developer Tools

- **Command Execution** - Run shell commands with safety checks
- **Git Integration** - Shortcuts for common git operations
- **File Context** - Load files into conversation context
- **Code Analysis** - Complexity, security, performance checks
- **Refactoring Suggestions** - AI-powered code improvements
- **Interactive Prompts** - Confirmation for dangerous operations

### 🎯 Advanced Features

- **Streaming Responses** - Real-time AI output
- **Response Caching** - 5-minute TTL, saves tokens and time
- **Voice Input** - Speech-to-text for hands-free coding
- **Custom Themes** - Personalize colors and appearance
- **Plugin System** - Extend with custom commands and providers
- **MCP Integration** - Tool use via Model Context Protocol
- **Performance Metrics** - Request tracking, timing, token usage

---

## 📸 Screenshots

### Welcome Screen
```
╦ ╦╔═╗╦═╗╔═╗  ╔═╗╦  ╦    [Beautiful gradient: cyan → purple]
║║║╠═╣╠╦╝╠═╝  ║  ║  ║
╚╩╝╩ ╩╩╚═╩    ╚═╝╩═╝╩
  AI Coding Assistant

╭─ ✨ Getting Started ──────────────────────────────────╮
│                                                        │
│  Welcome to Warp CLI!                                  │
│                                                        │
│  ✨ Natural language AI assistant                     │
│  🔄 Multi-provider support (4 providers)              │
│  💾 Persistent sessions with full-text search         │
│  🎨 Beautiful syntax highlighting                     │
│  🔒 Secure API key management                         │
│                                                        │
│  Type /help to get started                            │
│                                                        │
╰────────────────────────────────────────────────────────╯
```

### AI Response with Syntax Highlighting
```
────────────────────────────────────────────────────────
✨ AI [10:30:46] • 156 tokens

Here's how to create a Fibonacci function in Python:

╭─ python ───────────────────────────────────────────╮
│ def fibonacci(n: int) -> int:                      │
│     """Calculate nth Fibonacci number."""          │
│     if n <= 1:                                      │
│         return n                                    │
│     return fibonacci(n - 1) + fibonacci(n - 2)     │
╰─────────────────────────────────────────────────────╯

Key points:
  • Recursive approach (simple but not optimal)
  • Add memoization for better performance
  • For large n, use iterative approach

────────────────────────────────────────────────────────
```

### Command Execution Block
```
╭─ Shell ────────────────────────────────────────────╮
│                                                     │
│ Command:                                            │
│   ▸ git status                                      │
│                                                     │
│ Output:                                             │
│   On branch main                                    │
│   Your branch is up to date with 'origin/main'.    │
│                                                     │
│   nothing to commit, working tree clean            │
│                                                     │
│ ✓ Success                                           │
│                                                     │
╰─────────────────────────────────────────────────────╯
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Terminal** - iTerm2, Tabby, Alacritty, Windows Terminal, etc.
- **AI Provider** - At least one of:
  - Ollama (local, free) - [Install](https://ollama.ai/)
  - OpenAI API key
  - Anthropic API key
  - Google Gemini API key

---

### Install Warp CLI (Standalone)

#### Option 1: Quick Install (Global)

```bash
# Clone repository
git clone https://github.com/harryneopotter/aicli.git
cd aicli/warp-cli

# Install dependencies
npm install

# Build
npm run build

# Install globally
npm link

# Run setup wizard
warp setup

# Start chatting!
warp
```

#### Option 2: Local Development

```bash
cd warp-cli
npm install
npm run dev
```

---

### Install Tabby AI Agent (Plugin)

```bash
cd tabby-ai-agent

# Install dependencies
npm install

# Install MCP servers (optional)
npm run install-mcp

# Build plugin
npm run build

# Copy to Tabby plugins directory
# macOS/Linux:
cp -r dist ~/.config/tabby/plugins/ai-agent

# Windows:
copy dist %APPDATA%\tabby\plugins\ai-agent

# Restart Tabby
```

**Configure in Tabby:**
Settings → Plugins → AI Agent → Configure

---

## 📖 Usage Examples

### Basic Chat

```bash
$ warp

› chat › how do I find large files in my project?

✨ AI: You can use the find command:

╭─ bash ─────────────────────────────────────────╮
│ find . -type f -size +10M -exec ls -lh {} \;  │
╰─────────────────────────────────────────────────╯

This finds files larger than 10MB in the current directory.
```

### Command Explanation

```bash
› chat › /explain tar -xzvf archive.tar.gz

✨ AI: Let me break down this command:

• tar - Archive utility
• -x - Extract files
• -z - Decompress with gzip
• -v - Verbose (show progress)
• -f - File name follows

This extracts a gzip-compressed tar archive.
```

### Command Suggestion

```bash
› chat › /suggest delete all node_modules folders

✨ AI: Here's a safe way to do this:

╭─ bash ────────────────────────────────────╮
│ find . -name "node_modules" -type d \    │
│   -prune -exec rm -rf {} +               │
╰────────────────────────────────────────────╯

⚠️  Warning: This will delete all node_modules!
✓ Recommended: Run with -print first to preview
```

### Session Management

```bash
# Create new session
› /new python-project-help

# Save session with name
› /save debugging-auth-issue

# List all sessions
› /list

╭────┬─────────────────────┬───────────────┬───────────╮
│ ID │ Name                │ Created       │ Messages  │
├────┼─────────────────────┼───────────────┼───────────┤
│ a3 │ debugging-auth      │ Dec 15, 10:30 │ 24        │
│ b7 │ python-project      │ Dec 15, 09:15 │ 18        │
│ c2 │ refactoring-api     │ Dec 14, 16:45 │ 42        │
╰────┴─────────────────────┴───────────────┴───────────╯

# Load session
› /load a3

# Search sessions
› /search authentication

# Export session
› /export a3 markdown > session.md
```

### Provider Switching

```bash
# Check current provider
› /provider
Current provider: ollama (llama3.2)

# Switch to Claude
› /provider anthropic
✓ Switched to provider: anthropic

# Change model
› /model claude-3-5-sonnet-20240620
✓ Model set to: claude-3-5-sonnet-20240620
```

### Context Awareness

```bash
› /context

╭─ Current Context ─────────────────────────────╮
│                                                │
│ Working Directory: /home/user/my-project       │
│ OS: Linux (x86_64)                             │
│ Shell: zsh                                     │
│                                                │
│ Git Repository:                                │
│ - Branch: feature/user-auth                    │
│ - Status: 3 modified, 1 new                    │
│                                                │
│ Project:                                       │
│ - Type: Node.js                                │
│ - Name: my-api                                 │
│ - Version: 2.3.1                               │
│ - Scripts: start, test, build, lint            │
│                                                │
│ Recent Commands:                               │
│ 1. npm test                                    │
│ 2. git status                                  │
│ 3. npm run build                               │
│                                                │
╰────────────────────────────────────────────────╯
```

### File Context Loading

```bash
# Add files to context
› /context add src/auth.ts src/models/user.ts

✓ Added 2 files to context (543 lines)

# Now ask questions about the code
› how can I improve the authentication logic?

✨ AI: Looking at your auth.ts, I see several areas for improvement:

1. Password hashing...
```

### Code Analysis

```bash
› /analyze security src/

🔍 Analyzing security...

╭─ Security Analysis ───────────────────────────╮
│                                                │
│ ⚠️  High: Potential SQL injection             │
│    File: src/db/users.ts:45                    │
│    Fix: Use parameterized queries             │
│                                                │
│ ⚠️  Medium: API key in source code            │
│    File: src/config.ts:12                      │
│    Fix: Use environment variables             │
│                                                │
│ ✓ Good: Input validation present              │
│ ✓ Good: HTTPS enforced                        │
│                                                │
│ Score: 7/10                                    │
│                                                │
╰────────────────────────────────────────────────╯
```

### Diff Viewer

```bash
› /suggest refactor this function to use async/await

✨ AI: Here's the refactored version:

╭─ Diff View ───────────────────────────────────╮
│                                                │
│ - function getData(callback) {                │
│ -   db.query('SELECT * FROM users', (err,     │
│ -     if (err) callback(err);                 │
│ -     callback(null, results);                │
│ -   });                                        │
│ - }                                            │
│                                                │
│ + async function getData() {                  │
│ +   const results = await db.query(           │
│ +     'SELECT * FROM users'                   │
│ +   );                                         │
│ +   return results;                           │
│ + }                                            │
│                                                │
╰────────────────────────────────────────────────╯

Apply changes? [y/N]
```

---

## 🔒 Security Features

### Secure API Key Management

**OS Keychain Integration:**
```bash
# API keys stored securely in system keychain
warp setup

? Select provider: OpenAI
? Enter API key: **********
✓ API key securely stored in system keychain

# Keys retrieved automatically
warp chat
```

**Supports:**
- macOS: Keychain Access
- Windows: Credential Manager
- Linux: Secret Service (GNOME/KDE)

### Command Validation

```bash
# Whitelist-based command execution
› /exec git status
✓ Executing: git status

› /exec rm -rf /
✗ Error: Command not allowed: rm
  Allowed commands: git, npm, yarn, ls, pwd, cat, grep

# Interactive confirmation for risky commands
› /exec npm run deploy-production

⚠️  Warning: This command may modify production!

Command: npm run deploy-production
Risk Level: HIGH

Continue? [y/N]
```

### Session Encryption

All sessions are encrypted at rest using AES-256-GCM encryption with unique keys per user.

### Audit Logging

Complete audit trail of all activities:
```bash
~/.warp-cli/logs/audit.log

[2024-12-15 10:30:45] SESSION_CREATED id=abc123 user=john
[2024-12-15 10:31:02] COMMAND_EXECUTED cmd="git status" exit_code=0
[2024-12-15 10:31:15] AI_REQUEST provider=openai model=gpt-4 tokens=234
```

---

## ⚙️ Configuration

### Interactive Setup

```bash
warp setup

? Select default provider:
  ❯ Ollama (local, free)
    OpenAI (GPT-4)
    Anthropic (Claude)
    Google (Gemini)

? Configure Ollama:
  Endpoint: http://localhost:11434
  Model: llama3.2

? Enable streaming responses? Yes
? Enable syntax highlighting? Yes
? Enable auto-save? Yes

? Enable security features:
  [x] Command validation
  [x] Dangerous command confirmation
  [x] Audit logging
  [x] Session encryption

✓ Configuration complete!
```

### Configuration File

**Location:**
- macOS/Linux: `~/.config/warp-cli/config.json`
- Windows: `%APPDATA%\warp-cli\config.json`

### Environment Variables

```bash
# API Keys (if not using keychain)
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="..."

# Ollama
export OLLAMA_ENDPOINT="http://localhost:11434"
export OLLAMA_MODEL="llama3.2"
```

---

## 🎓 Advanced Features

### Custom Themes

```bash
# Create custom theme
~/.config/warp-cli/themes/my-theme.json
```

```json
{
  "name": "My Custom Theme",
  "colors": {
    "primary": "#FF6B6B",
    "secondary": "#4ECDC4",
    "success": "#95E1D3"
  }
}
```

### Plugin System

```typescript
// ~/.warp-cli/plugins/my-plugin/index.ts
export default {
  name: 'my-plugin',
  commands: {
    '/mycommand': async (args: string[]) => {
      return 'Custom command output';
    }
  }
};
```

### Session Templates

```bash
# Create template
warp template create code-review

# Use template
warp new --template code-review
```

### Voice Input

```bash
# Enable voice input
warp config voice enable

# Use voice (Ctrl+V)
› [🎤 Listening...]

"How do I merge two git branches?"
```

---

## 🏗️ Architecture

### Warp CLI Architecture

```
┌─────────────────────────────────────────────┐
│         CLI Entry Point (cli.ts)            │  User Interface
├─────────────────────────────────────────────┤
│  UI Renderer (tabby-renderer.ts)            │  Presentation
│  - Gradient colors                          │
│  - Syntax highlighting                      │
│  - Block-based output                       │
├─────────────────────────────────────────────┤
│  Services Layer                             │  Business Logic
│  ├─ ChatService - AI orchestration          │
│  ├─ SessionService - Session management     │
│  ├─ ContextService - Environment awareness  │
│  ├─ ConfigService - Configuration           │
│  └─ SecurityService - Validation & auth     │
├─────────────────────────────────────────────┤
│  Provider Abstraction (Strategy Pattern)    │  Plugin Architecture
│  ├─ BaseLLMProvider (abstract)              │
│  ├─ OllamaProvider                          │
│  ├─ OpenAIProvider                          │
│  ├─ AnthropicProvider                       │
│  └─ GeminiProvider                          │
├─────────────────────────────────────────────┤
│  Storage Layer                              │  Persistence
│  └─ SessionStorage (SQLite + FTS5)          │
│     - Encrypted sessions                    │
│     - Full-text search                      │
└─────────────────────────────────────────────┘
```

### Tech Stack

**Core:**
- TypeScript 5.0+ (strict mode)
- Node.js 16+
- SQLite3 (with FTS5)

**UI/Terminal:**
- chalk, gradient-string, cli-highlight
- boxen, ora, inquirer

**Security:**
- keytar (OS keychain)
- crypto (AES-256-GCM encryption)

---

## 🤝 Contributing

We welcome contributions! Whether it's bug fixes, new features, or documentation improvements.

```bash
# Fork and clone
git clone https://github.com/your-username/aicli.git

# Create a branch
git checkout -b feature/amazing-feature

# Make changes
cd warp-cli
npm install
npm run dev

# Test
npm test

# Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

---

## 🐛 Troubleshooting

### Cannot connect to Ollama

```bash
# Check if Ollama is running
ollama serve

# Verify endpoint
curl http://localhost:11434/api/tags
```

### API Key Invalid

```bash
# Re-enter API key
warp setup
```

### Syntax Highlighting Not Working

```bash
# Check terminal capabilities
echo $COLORTERM  # Should be 'truecolor'

# Enable in config
warp config set ui.syntaxHighlight true
```

### Debug Mode

```bash
# Enable debug output
warp --debug
```

---

## 🗺️ Roadmap

### Version 2.0 ✅

- [x] Syntax highlighting
- [x] Gradient colors
- [x] Block-based UI
- [x] OS keychain integration
- [x] Session encryption
- [x] Command validation

### Version 2.1 (In Progress)

- [ ] Plugin system
- [ ] Voice input
- [ ] Diff viewer
- [ ] Session sharing
- [ ] Custom themes
- [ ] Code analysis tools

### Version 3.0 (Future)

- [ ] GUI mode (Electron)
- [ ] Cloud sync
- [ ] Mobile app
- [ ] VS Code integration

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

**Inspired by:**
- [Warp.dev](https://warp.dev) - Beautiful terminal UI
- [GitHub Copilot CLI](https://githubnext.com/projects/copilot-cli) - AI command suggestions
- [Aider](https://aider.chat) - AI pair programming

**Built with:**
- [Anthropic Claude](https://anthropic.com)
- [Ollama](https://ollama.ai)
- [Tabby Terminal](https://tabby.sh)

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/harryneopotter/aicli/issues)
- **Discussions:** [GitHub Discussions](https://github.com/harryneopotter/aicli/discussions)

---

<div align="center">

**Made with ❤️ by developers, for developers**

[⬆ Back to Top](#-ai-cli---complete-ai-coding-assistant-suite)

</div>
