# Copilot Instructions for Warp CLI

This project is a standalone CLI AI agent for personal use, designed to run in any terminal and leverage both local and cloud LLMs for coding and system tasks.

## Architecture & Key Patterns

- **Service-Oriented Structure:**
  - `warp-cli/src/services/` contains core logic for chat, context, config, and session management.
  - `warp-cli/src/providers/` implements LLM integrations (OpenAI, Anthropic, Gemini, Ollama) using a common provider interface (`base.provider.ts`).
  - `warp-cli/src/ui/renderer.ts` handles terminal UI and user interaction.
- **Session & Context Awareness:**
  - Persistent session storage is managed in `warp-cli/storage/session.storage.ts` (SQLite-backed).
  - The agent automatically detects project type, git status, command history, and working directory, surfacing this context to the AI for smarter responses.
- **Provider Pattern:**
  - All LLMs are implemented as providers extending a base interface, making it easy to add new models.
  - Providers are registered in `warp-cli/src/providers/index.ts`.

## Developer Workflows

- **Build & Test:**
  - `npm run dev` — Development mode
  - `npm run build` — Production build
  - `npm test` — Run tests
- **CLI Development:**
  - Use `npm link` in `warp-cli` for global CLI access during development.
- **Configuration:**
  - AI provider settings are managed via JSON config files or CLI prompts.
  - See `warp-cli/README.md` for example configs and usage.

## Project-Specific Conventions

- **Context-First AI:**
  - Always surface relevant project, git, and session context to the AI before generating responses.
- **Session Management:**
  - Sessions are persistent and can be exported as JSON or Markdown.
- **Command Execution:**
  - The agent can execute shell/system commands and analyze outputs as part of its workflow.
- **Testing:**
  - Tests are co-located in `warp-cli` and use standard Node.js/TypeScript testing tools.

## Key Files & Directories

- `warp-cli/src/cli.ts` — CLI entry point
- `warp-cli/src/providers/` — LLM provider implementations
- `warp-cli/src/services/` — Core services (chat, config, context, session)
- `warp-cli/src/ui/renderer.ts` — Terminal UI logic
- `warp-cli/storage/session.storage.ts` — Persistent session storage

## Example: Adding a New LLM Provider
1. Implement a new provider in `warp-cli/src/providers/` extending `base.provider.ts`.
2. Register it in `warp-cli/src/providers/index.ts`.
3. Update configuration and add tests as needed.

---

For more, see `warp-cli/README.md`.
