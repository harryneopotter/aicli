# AiCli Implementation Plan (Post-Reality-Check Rebuttal)

Goal: Close the gaps highlighted in the revised critique, preserve the decisions that were validated, and deliver incremental improvements that can be demonstrated within the next two releases.

## Workstream A — Service Orchestration & Naming (P0)
**Objective:** Reduce the surface area of `ChatService`, make responsibilities explicit, and enable easier testing.

- [ ] Introduce `AgentCoordinator` (new name for current `ChatService`) whose only responsibility is to run the conversation loop and dispatch events.
- [ ] Extract `ConversationService` (message sequencing, history management) and `ProviderManager` (provider lifecycle + switching) from the existing class.
- [ ] Extract `ToolExecutor` responsible for tool loop evaluation so that tool-specific code is isolated from conversation flow.
- [ ] Create a light-weight dependency injection layer (factory function or `ServiceContainer`) so services receive dependencies through constructors instead of shared singletons; update unit tests to leverage this injection for mocking.
- [ ] Update docs and CLI help text to use the new names and describe the orchestration layout.

## Workstream B — Tool Invocation Protocol (P0)
**Objective:** Replace the XML wrapper with provider-native formats and strict JSON fallbacks.

- [ ] Add capability detection to each provider (`supportsNativeFunctionCalling`, `supportsJSONMode`).
- [ ] For OpenAI/Anthropic: route tool calls through their structured APIs and drop manual parsing.
- [ ] For text-only models (Ollama, GGUF): update the system prompt to emit ```json fenced blocks with pure JSON payloads; remove `<tool_code>` tags entirely.
- [ ] Normalize all tool responses through a Zod schema gate before execution, returning actionable UI errors when validation fails.
- [ ] Backfill regression tests that prove each provider pathway still executes the math tool and file tool end-to-end.

## Workstream C — Command Execution Security (P0)
**Objective:** Eliminate the tokenizer-first validation gap and tighten guardrails around command execution.

- [ ] Introduce `CommandValidator.validateRawCommand` that runs before tokenization; reject commands with disallowed patterns immediately.
- [ ] Update tokenizer to operate on already-sanitized input and add tests for tricky payloads (`$'...'`, unicode escapes, nested quotes).
- [ ] Lock down environment inheritance: explicit whitelist of env vars for child processes plus `cwd` enforcement to prevent escaping the workspace.
- [ ] Expand `/exec` integration tests to include the new raw-validation path and confirm blocked payloads never reach `execFile`.

## Workstream D — Training Feature Truth-in-Labeling (P1)
**Objective:** Align expectations with reality while laying groundwork for measurable improvement.

- [ ] Rename CLI command output and docs to `Training (Experimental)`; emit a warning banner when `/train` runs.
- [ ] Replace substring scoring with a pluggable evaluator so we can run the same sample set with and without playbooks.
- [ ] Capture pre/post metrics (accuracy, latency) and store them alongside each playbook artifact for auditing.
- [ ] Update README and REALITY_CHECK_RESPONSE.md to describe the feature as "strategy extraction" rather than "self-learning" until metrics prove otherwise.

## Workstream E — MCP Resilience (P1)
**Objective:** Prevent hanging promises and improve operator feedback.

- [ ] Wrap each MCP request in a 30s timeout; surface a descriptive error that includes the tool name and request id.
- [ ] Add exponential backoff retry (max 2) for transient transport errors.
- [ ] Emit health pings to MCP subprocesses and automatically restart them if the pipe closes unexpectedly.
- [ ] Extend unit tests to simulate stalled responses and ensure the timeout path resolves.

## Workstream F — Documentation & Messaging (P1)
**Objective:** Keep messaging in sync with the implementation changes.

- [ ] Update `README.md`, `IMPROVEMENT_PLAN.md`, and CLI `--help` to reflect the new architecture names, tool protocol, and training disclaimer.
- [ ] Add a code comment block above the Safe Delete implementation summarizing the cross-platform rationale (per reviewer suggestion).
- [ ] Publish a short "What changed since the review" note linking to revised architecture diagrams and test evidence (coverage + new regression tests).

## Delivery & Validation Strategy

1. **Sprint 1 (P0 focus)**: Complete Workstreams A–C with unit + integration tests and a CLI demo script.
2. **Sprint 2 (P1 focus)**: Ship Workstreams D–F plus any spillover hardening tasks.
3. **Definition of Done**: All revised tests green locally and in CI, docs updated, and REALITY_CHECK_RESPONSE.md amended with links to the shipped improvements.
