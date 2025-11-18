# AI CLI Suite

AI CLI is a two-part toolkit that brings production-ready AI assistance to any terminal. Run the standalone Warp CLI agent when you need a secure, provider-agnostic chatbot in every shell, or load the Tabby AI Agent when you want MCP-enhanced workflows directly inside Tabby.

---

## Why It Matters

| Developer Pain Point | AI CLI Advantage |
| --- | --- |
| Need an AI pair-programmer that works across remote/local terminals | Warp CLI ships as a portable CLI, supports local (Ollama) and cloud providers, and keeps context in encrypted SQLite. |
| Want AI help injected into Tabby with MCP tooling | Tabby AI Agent adds SMART/AI/SHELL modes, MCP orchestration, and context-aware replies without leaving the app. |
| Security/compliance demands | Keytar-backed secrets, sanitized errors, filtered env vars, zod validation, rate limiting, and AES-256-GCM session encryption. |
| Terminal UX fatigue | Gradient prompts, syntax-highlighted markdown/code blocks, plugin hooks, context attachments, diff view, undo, autocomplete, and streaming output. |

---

## Components

### Warp CLI (`warp-cli/`)
Warp-inspired CLI agent wired through a dependency-injected core.

- **Multi-LLM chat:** Ollama, OpenAI, Anthropic, Gemini with streaming and live provider switching.
- **Context intelligence:** Git status, project detection, command history, optional file attachments, and auto-generated system prompts.
- **Encrypted session engine:** Persistent, searchable, exportable sessions stored in AES-256-GCM–encrypted SQLite with autosave.
- **Security tooling:** zod config schemas, rate limiting (`bottleneck`), secure API key vault (`keytar`), structured errors, sanitized outputs, and hardened `/exec`.
- **CLI UX:** Gradient welcome screen, tables/boxes, syntax-highlighting, `/ctxfile` manager, `/diff`, `/plugins`, `/plugin`, `/undo`, `/autocomplete`, `/stats`, `/export`, and more.
- **Plugin surface:** Built-in context digest plugin plus support for external JS plugins placed in `~/.warp-cli/plugins`.

### Tabby AI Agent (`tabby-ai-agent/`)
Plugin that embeds AI capabilities into Tabby.

- **SMART/AI/SHELL modes:** Mode switching via `\\ai`, `\\shell`, `\\toggle`, with automatic detection in SMART mode.
- **MCP orchestration:** Manage multiple MCP servers, priorities, and health metrics from one UI.
- **Context awareness:** Detect project types, git state, history, working directory, and feed that into the AI.
- **Accessibility:** Keyboard-first navigation, high-contrast support, and ARIA-friendly components.

---

## Feature Matrix

| Capability | Warp CLI | Tabby Plugin |
| --- | --- | --- |
| Multi-provider chat | ✅ | ✅ |
| Secure key storage (keytar) | ✅ | ✅ |
| zod config validation | ✅ | ✅ |
| Structured error handling & sanitization | ✅ | ✅ |
| Session persistence + encryption | ✅ | ✅ |
| Git/project/command context | ✅ | ✅ |
| Context file attachments & diff viewer | ✅ | — |
| Plugin system & autocomplete | ✅ | — |
| MCP server management | — | ✅ |
| SMART/AI/SHELL terminal modes | — | ✅ |

---

## Security & Reliability Highlights (Warp CLI)

- **RCE guardrails:** `/exec` uses a strict whitelist plus `execFile` and optional confirmations for sensitive commands.
- **Secret hygiene:** API keys migrate to keytar, env vars filtered before persistence, and errors sanitized to redact tokens.
- **Config integrity:** zod schemas enforce structure on load/import/set operations; invalid configs fail fast.
- **Rate limiting:** `bottleneck` enforces per-provider throttling to avoid quota spikes.
- **Encrypted storage:** Session context + metadata encrypted with AES-256-GCM and managed keys.
- **Dependency injection:** `container.ts` wires services through constructors to simplify audits/tests.

Track remediation progress in `SECURITY-REMEDIATION-LOG.md`.

---

## Repository Layout

```
aicli/
├── README.md                # This overview
├── warp-cli/                # Standalone CLI agent
│   ├── src/
│   │   ├── cli.ts          # Entry point
│   │   ├── commands/       # Slash command handlers
│   │   ├── providers/      # LLM provider implementations
│   │   ├── services/       # Config, context, chat, session, plugin, autocomplete
│   │   ├── storage/        # SQLite persistence + encryption
│   │   └── ui/             # Renderer utilities
│   └── EXAMPLES.md
└── tabby-ai-agent/          # Tabby plugin with MCP support
    ├── src/
    │   ├── plugin.ts
    │   ├── services/
    │   └── components/
    └── config-schema.json
```

---

## Quick Start

```bash
# Warp CLI
cd warp-cli
npm install
npm run build
npm link        # optional; exposes `warp` globally
warp setup      # select provider + configure API keys/endpoints
warp            # start chatting

# Tabby AI Agent
cd tabby-ai-agent
npm install
npm run build
# copy or symlink dist output into Tabby’s plugin directory, then restart Tabby
```

---

## Development Scripts

```bash
# Warp CLI
npm run dev      # ts-node dev loop
npm run build    # compile TypeScript
npm test         # (tests incoming)

# Tabby plugin
npm run build
npm test
```

---

## Contributing & Support

1. Fork → feature branch → PR (include tests/docs where sensible).
2. Discuss ideas or issues at https://github.com/harryneopotter/aicli/issues.
3. Component-specific docs live in `warp-cli/README.md` and `tabby-ai-agent/README.md`.

**License:** MIT

Built with ❤️ for developers who live in the terminal.
