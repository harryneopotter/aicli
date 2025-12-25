# Revised Feedback Implementation Plan

This document maps each action item to the corresponding point raised in `Revised_reality_check.md` so stakeholders can see exactly which concern is being addressed and what success looks like.

## 1. Service Orchestration & Naming
- **Feedback Reference:** #1 "ChatService as Orchestrator", #8 "Architecture Claims".
- **Problem Restated:** The current `ChatService` name and responsibility set obscure its orchestration role, and singleton imports make testing and refactoring harder even if there are no circular dependencies.
- **Plan:**
  - Rename `ChatService` to `AgentCoordinator` to signal orchestration duties.
  - Extract `ConversationService`, `ProviderManager`, and `ToolExecutor` so provider switching, history flow, and tool loops are isolated modules.
  - Introduce a small dependency injection container so services receive dependencies via constructors instead of shared singletons.
- **Why This Solves It:** Renaming plus extraction directly answers the scope concern, while DI removes the hidden coupling noted in feedback #8.
- **Success Criteria:** New services with unit tests, updated CLI wiring, and documentation diagrams reflecting the split.

## 2. Tool Invocation Protocol Modernization
- **Feedback Reference:** #2 "XML Tool Wrapper".
- **Problem Restated:** XML wrappers do not provide extra safety because text-only models can emit JSON when prompted, and providers with native function-calling should use their structured APIs.
- **Plan:**
  - Detect `supportsNativeFunctionCalling`/`supportsJSONMode` per provider.
  - Use provider-native tool APIs for OpenAI/Anthropic; require ```json fenced outputs for Ollama/GGUF and drop `<tool_code>`.
  - Validate every tool payload with Zod prior to execution and emit actionable UI errors when validation fails.
- **Why This Solves It:** Aligns tooling with each provider's strengths, eliminates unnecessary XML parsing, and enforces schema-level safety highlighted as missing in the critique.
- **Success Criteria:** Regression tests covering at least one tool call per provider path and documentation updates explaining the new protocol.

## 3. Command Execution Guardrails
- **Feedback Reference:** #4 "Command Injection Prevention".
- **Problem Restated:** Validation happens after tokenization, allowing edge cases like `$'...'` to bypass safeguards.
- **Plan:**
  - Add `validateRawCommand` that runs on the untokenized string before parsing.
  - Restrict inherited environment variables and enforce a fixed `cwd` for each command.
  - Expand tests with payloads mentioned in the review (unicode escapes, nested quotes) to ensure they fail fast.
- **Why This Solves It:** Pre-token validation removes the identified gap, matching the reviewer's recommended approach.
- **Success Criteria:** Updated tests demonstrating blocked payloads never reach `execFile`, plus documentation in `SECURITY.md` describing the new order of operations.

## 4. Streaming Assurance
- **Feedback Reference:** #5 "Streaming Actually Works" (acknowledged as correct but worth proving).
- **Problem Restated:** Reviewer conceded streaming works yet confusion stemmed from tool-call pauses.
- **Plan:**
  - Add an integration test that streams a provider response, invokes a tool mid-conversation, and resumes streaming to showcase expected behavior.
  - Document in README that streaming pauses during tool parsing by design.
- **Why This Solves It:** Provides tangible evidence and documentation to prevent future misunderstandings.
- **Success Criteria:** New integration test plus README note referencing expected pauses.

## 5. Training Feature Truth-in-Labeling
- **Feedback Reference:** #6 "Training Feature Evaluation".
- **Problem Restated:** Substring scoring and "self-improvement" messaging overstate what the feature delivers.
- **Plan:**
  - Present the feature as "Strategy Extraction (Experimental)" in CLI and docs; display a runtime warning when `/train` runs.
  - Replace substring scoring with pluggable evaluators and capture before/after accuracy metrics for each playbook.
  - Store metrics alongside playbook artifacts and gate promotion if no measurable improvement is observed.
- **Why This Solves It:** Aligns expectations with reality while creating the instrumentation needed to prove future gains.
- **Success Criteria:** Updated docs/UI copy, metrics persisted for each training run, and a report showing baseline vs. assisted accuracy.

## 6. MCP Resilience
- **Feedback Reference:** #7 "MCP Maturity".
- **Problem Restated:** Pending-request promises can hang indefinitely because there is no timeout or retry path.
- **Plan:**
  - Add a 30-second timeout per MCP request with descriptive rejection messages.
  - Implement exponential backoff retries (max two) for transient transport errors and restart the MCP subprocess if the pipe closes.
  - Extend unit tests to simulate stalled responses and verify timeout cleanup.
- **Why This Solves It:** Directly addresses the hanging-promise scenario cited in the review.
- **Success Criteria:** Tests covering timeout, retry, and restart paths plus updated README footnotes on the MCP feature's maturity.

## 7. Safe Delete Commentary
- **Feedback Reference:** #3 "Safe Delete Complexity" (validated but requested documentation).
- **Problem Restated:** Reviewer now agrees with the implementation but asked for an explanatory comment to prevent future "optimization" attempts.
- **Plan:**
  - Add a code comment block above the Safe Delete implementation describing cross-device moves, atomic rename fallbacks, and staging area protection requirements.
  - Reference this comment from the documentation so new contributors understand the constraints.
- **Why This Solves It:** Preserves institutional knowledge and prevents regressions that the reviewer warned against.
- **Success Criteria:** Comment merged, linked in docs, and cited in REALITY_CHECK_RESPONSE.md.

## 8. Documentation & Messaging Alignment
- **Feedback Reference:** Applies globally to ensure rebuttal statements remain accurate as code changes land.
- **Problem Restated:** Once the above actions ship, the rebuttal and README must reflect reality.
- **Plan:**
  - Update README, CHANGELOG, and REALITY_CHECK_RESPONSE.md after each workstream completes.
  - Publish a "What changed since the review" note summarizing evidence (tests, metrics, architecture diagrams).
- **Why This Solves It:** Keeps stakeholder messaging synchronized with implementation progress, preventing outdated claims.
- **Success Criteria:** Documentation PR linked to each code change and sign-off from stakeholders using this plan as the checklist.
