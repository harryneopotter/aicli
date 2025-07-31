# AI CLI - Tabby AI Agent Plugin

## Overview

This project, `aicli`, contains the `tabby-ai-agent` plugin for Tabby, an AI-assisted terminal integration. It enables natural language processing in the terminal, leveraging Model Context Protocol (MCP) servers for enhanced functionality like context management and AI interactions (e.g., with Ollama or Gemini API).

Key features:
- Intercepts terminal input to distinguish commands from natural language queries.
- Builds dynamic system prompts with context (e.g., working directory, git status).
- Integrates MCP tools for advanced operations.
- Modular services for AI agent logic, context management, and MCP client handling.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/harryneopotter/aicli.git
   cd aicli
   ```

2. Install dependencies in `tabby-ai-agent`:
   ```bash
   cd tabby-ai-agent
   npm install
   ```

3. Install MCP servers:
   ```bash
   node scripts/install-mcp-servers.js
   ```

4. Build the plugin:
   ```bash
   npm run build
   ```

5. Integrate with Tabby: Follow Tabby's plugin installation guide to add the built plugin.

## Usage

- Open a terminal in Tabby.
- Type natural language queries (e.g., "What's my current directory?")—the AI agent will respond.
- Regular commands are executed normally.
- Configure AI models and API keys in relevant services.

## Development

- Source code is in `tabby-ai-agent/src/`.
- Build with `npm run build` (uses Webpack).
- For fixes and improvements, see `tabby-ai-agent/PLAN.md`.

## Contributing

Contributions welcome! Fork the repo, create a branch, and submit a PR.

## License

MIT License (add details if needed).