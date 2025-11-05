# AI CLI - Complete AI Coding Assistant Suite

This repository contains two powerful AI coding assistants:

## 1. Warp CLI - Standalone CLI Coding Agent

**Location:** `/warp-cli`

A complete, standalone CLI-based coding agent similar to Warp.dev with support for multiple LLM providers.

### Key Features:
- ✅ Multi-LLM support (Ollama, OpenAI, Anthropic, Gemini)
- ✅ Persistent session storage with SQLite
- ✅ Smart context awareness (Git, project detection, command history)
- ✅ Beautiful Warp-inspired terminal UI
- ✅ Command execution and shell integration
- ✅ Session management and search
- ✅ Streaming responses
- ✅ Export sessions as JSON or Markdown

**[Full Documentation →](warp-cli/README.md)**

### Quick Start:
```bash
cd warp-cli
npm install
npm run build
npm link
warp setup
warp
```

---

## 2. Tabby AI Agent Plugin

**Location:** `/tabby-ai-agent`

A plugin for the Tabby terminal that integrates AI capabilities with MCP (Model Context Protocol) support.

### Key Features:
- Tabby terminal integration
- MCP server support
- Multi-mode operation (Smart, AI, Shell)
- Context-aware AI responses

**[Full Documentation →](tabby-ai-agent/README.md)**

---

## Project Structure

```
aicli/
├── warp-cli/              # Standalone CLI application
│   ├── src/
│   │   ├── cli.ts         # Main entry point
│   │   ├── commands/      # Command handlers
│   │   ├── providers/     # LLM provider implementations
│   │   ├── services/      # Core services
│   │   ├── storage/       # Session storage
│   │   └── ui/            # Terminal UI
│   ├── README.md
│   ├── EXAMPLES.md
│   └── package.json
│
└── tabby-ai-agent/        # Tabby plugin
    ├── src/
    │   ├── plugin.ts      # Plugin entry
    │   ├── services/      # AI and MCP services
    │   └── components/    # UI components
    ├── README.md
    └── package.json
```

## Which Should I Use?

### Use **Warp CLI** if you want:
- A standalone, ready-to-use AI coding assistant
- Support for multiple LLM providers
- Session management and persistence
- Works in any terminal

### Use **Tabby AI Agent** if you want:
- Deep integration with Tabby terminal
- MCP server capabilities
- Plugin-based extensibility

---

## Development

### Warp CLI Development
```bash
cd warp-cli
npm install
npm run dev          # Run in development mode
npm run build        # Build for production
npm test             # Run tests
```

### Tabby AI Agent Development
```bash
cd tabby-ai-agent
npm install
npm run build        # Build plugin
npm test             # Run tests
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
- Documentation: See individual project READMEs

---

## Roadmap

### Warp CLI
- [ ] Plugin system
- [ ] File context loading
- [ ] Code analysis tools
- [ ] Custom themes
- [ ] Voice input support

### Tabby AI Agent
- [ ] Complete MCP integration
- [ ] Enhanced context management
- [ ] Multi-model support
- [ ] Improved error handling

---

Made with ❤️ by the AI CLI Team
