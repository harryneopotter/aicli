# PROGRESS.md - AiCli

## 🚀 Latest Updates (2025-11-22)

### MCP Implementation
**Goal**: Enable Model Context Protocol support.
- **Created**: `src/services/mcp.service.ts` (MCP Client implementation)
- **Modified**: `src/services/tool.service.ts` (Added `registerMCPTools` to integrate MCP tools)
- **Modified**: `src/commands/handlers.ts` (Added `/mcp` command for connection management)
- **Verified**: `test_mcp.ts` confirmed connection, tool listing, and tool execution with a dummy server.

### RAG Implementation
**Goal**: Enable semantic search over the codebase.
- **Created**: `src/services/vector.service.ts` (In-memory vector store with disk persistence)
- **Created**: `src/services/rag.service.ts` (Indexing and search logic)
- **Modified**: `src/providers/ollama.provider.ts` (Implemented `embed` method)
- **Modified**: `src/services/tool.service.ts` (Added `search_code` tool)
- **Modified**: `src/commands/handlers.ts` (Added `/index` command)
- **Verified**: `test_rag.ts` confirmed indexing and retrieval accuracy.

### Smart Context
**Goal**: Optimize context window usage.
- **Created**: `src/utils/tokenizer.ts` (Token estimation and context optimization logic)
- **Modified**: `src/services/config.service.ts` (Added `maxContextTokens` setting)
- **Modified**: `src/services/chat.service.ts` (Integrated `Tokenizer.optimizeContext`)
- **Verified**: `test_smart_context.ts` confirmed correct pruning behavior.

### Robust Tool Protocol
**Goal**: Switch from fragile regex to JSON-based tool parsing.
- **Modified**: `src/services/tool.service.ts` (Added `parseToolCall`, updated system prompt to request `<tool_code>` JSON)
- **Modified**: `src/services/chat.service.ts` (Switched to `parseToolCall`)
- **Verified**: `test_tool_protocol.ts` confirmed valid/invalid JSON parsing.

### Code Cleanup
**Goal**: Remove legacy JS files to enforce TypeScript usage.
- **Removed**: 15 `.js` files from `src/` (providers, services, storage, ui).
- **Verified**: Clean build with `tsc`.

### Project Rename: warp-cli → aicli
**Goal**: Rebrand project to AiCli for consistency.
- **Modified**: `package.json` (name, bin command from `warp`/`warp-cli` → `aicli`)
- **Modified**: `cli.ts` (program name, config path `.warp-cli` → `.aicli`)
- **Modified**: `config.service.ts` (session directory, project name, themes directory)
- **Modified**: `security.service.ts` (keychain service name)
- **Modified**: `training.service.ts` (playbook directory)
- **Modified**: `README.md` (all references updated)
- **Renamed**: Directory `warp-cli/` → `aicli/`
- **Verified**: Build successful

### UI Designer Agent Enhancement
**Goal**: Train ui-designer agent with modern web standards (responsive, ARIA, SEO, Lighthouse).
- **Modified**: `agents/ui-designer.md` (Added comprehensive modern web standards section)
- **Standards Added**: Responsive design (mobile-first), WCAG 2.1 AA accessibility, SEO best practices, Lighthouse 90+ performance targets, quality checklists

### Project Restructuring
**Goal**: Make Warp CLI the standalone project (remove Tabby from Git tracking).
- **Modified**: `.gitignore` (Added `tabby-ai-agent/` to ignore list)
- **Modified**: Root `README.md` (Replaced with Warp CLI focused content)
- **Git**: Removed `tabby-ai-agent/` from tracking (kept locally)

### Interactive Onboarding
**Goal**: Add first-run onboarding with skip option.
- **Created**: `src/services/onboarding.service.ts` (First-run detection & setup wizard)
- **Modified**: `src/cli.ts` (Integrated onboarding check before chat session)

### Agent Calling Implementation
**Goal**: Enable agents to autonomously use tools (exec, read/write file).
- **Created**: `src/services/tool.service.ts` (Tool definitions & registry)
- **Modified**: `src/services/chat.service.ts` (Added "Thought-Action-Observation" execution loop)
- **Modified**: `src/services/context.service.ts` (Added `listFiles`, injected tools into system prompt)
- **Verified**: `test_agent_calling.ts` (Created & deleted after success)

### Security Implementation
**Goal**: Secure API keys in keychain and encrypt session data.
- **Modified**: `package.json` (Added `keytar` dependency)
- **Created**: `src/services/security.service.ts` (Keychain & AES-256-GCM encryption)
- **Modified**: `src/services/config.service.ts` (Integrated keychain for API keys)
- **Modified**: `src/storage/session-storage.ts` (Implemented encryption for session data)

---

## 🔄 In Progress / Remaining
- [ ] Automated coverage for safe delete staging output and path validation.
- [ ] Harden `/analyze` by surfacing human-readable summaries and adding automated tests.
- [ ] Restore linting confidence (`npm run lint`) and wire into CI.

---

## � Previous History (warp-cli v1.1-secure)

### ✅ Recent Fixes (Pre-v2.0)
- **Build stability:** Resolved TypeScript regressions (theme typing, missing modules, analysis service API) and confirmed `npm run build` succeeds.
- **Runtime parity:** `ts-node src/cli.ts` now launches cleanly; provider selector renders without crashing.
- **Theme system:** `Config.ui.theme` now accepts custom names, default palette no longer recurses infinitely, and `/theme` writes validated values.
- **Storage stack:** Session persistence migrated fully to `better-sqlite3`, matching `package.json` and eliminating callback plumbing.
- **Custom shims:** Added local typings (`gradient-string`, `google-it`, `better-sqlite3`, `eslint-plugin-security`) and pointed `tsconfig` `typeRoots` at them.
- **Safe delete:** Cross-platform interception now moves `rm`/`del` targets into `.not-needed` via Node APIs, with staging protection and per-arg path validation.
- **Personas:** Repaired YAML front-matter for `frontend-developer`, `project-shipper`, `rapid-prototyper`, and `ui-designer` so agent loading no longer throws.
