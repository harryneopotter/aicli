---
applyTo: '**'
---
**Mandatory Protocol** (Highest Precedence):
1. **Before** responding "done", "complete", or closing a task:
   - Append a dated section to `aicli/PROGRESS.md` using the **exact template** below.
   - Summarize **today's tasks** (from conversation context), **outcomes**, **current project status**, and **recommended next steps**.
   - Use tool calls: `edit_file` on `aicli/PROGRESS.md` (append mode).
2. **Commit if relevant**: `git add PROGRESS.md && git commit -m "docs: update progress [date]"`.
3. **Then** mark task complete in response.

**Why?** Ensures persistent, auditable progress tracking. No exceptions—enforced by policy.

## PROGRESS.md Update Template

Use this **exact Markdown structure** (append only, no overwrites):

```markdown
## YYYY-MM-DD (Summary)

### Tasks Done Today & Outcomes
- **Task 1**: Description from user/agent interaction.  
  **Outcome**: Success (e.g., "Fixed deps, tested chat") | Partial | Fail (reason + fix plan).
- **Task 2**: ...

### Current Project Status
- **warp-cli**: Linked globally, deps fixed (Jest 29.x), file-load feature added (`/load <file>`), providers configured (Ollama/qwen2.5-coder:3b, Gemini-2.5-flash-exp via env GEMINI_API_KEY, OpenRouter qwen2.5-coder:7b via OPENROUTER_API_KEY). Ready for `warp chat`. No errors.
- **tabby-ai-agent**: Cleaned (untracked moved to .not-needed), minor plugin.ts/package.json tweaks staged.
- **Overall**: Git clean (master up-to-date), no diagnostics, dual components (CLI primary).
- **Sessions/DB**: Ready at `%APPDATA%\warp-cli\`.

### Next Steps (Prioritized)
1. **High**: Test `warp chat` with `/load package.json` + query deps (Ollama/Gemini).
2. **High**: Add Jest tests for new `/load` (80% coverage).
3. **Med**: `npm publish --access public` warp-cli v1.0.0.
4. **Med**: Merge remote branches if useful (`origin/feature/improve-aicli-plugin`).
5. **Low**: Polish Tabby plugin, add voice/plugins.

**Total Progress**: 90% MVP → Production-ready CLI.
```

## Enforcement
- **Agents MUST** tool-call `edit_file` on `aicli/PROGRESS.md` **every time**.
- **If PROGRESS.md missing**: Create it first with initial status.
- **Conversation Context Capture**:
  | Date (Today) | Tasks Done |
  |--------------|------------|
  | 2025-11-16 | - Cleaned Git (moved untracked to .not-needed).<br>- Fixed package.json deps (Jest/ts-jest conflict).<br>- Added `/load <file>` feature (context injection).<br>- Configured providers (Ollama, Gemini 2.5, OpenRouter Qwen2.5).<br>**Outcomes**: All success—warp-cli built/linked/configured. |

## Additional Rules
- **Be Conversational + Professional**: "I've updated PROGRESS.md—task complete!"
- **No Apologies**: Just facts/outcomes.
- **Markdown Responses**: Use ```path#L1-10 for code.
- **Tool Discipline**: No web servers, guess paths, etc. (per policy).

**Follow or risk policy violation.** Update PROGRESS.md **now** for compliance.