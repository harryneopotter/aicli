# Test Coverage Implementation Plan (P1-001)

**Date:** 2025-11-23
**Status:** Planned
**Target Coverage:** 70% Overall

## 1. Executive Summary

Current test coverage is approximately **13%**, primarily covering `SecurityService`, `CommandValidator`, and `DocsService`. To reach the **70% target**, we need to implement comprehensive unit and integration tests for the core business logic: Chat, Sessions, Providers, and the newly added P2 features (Error Handling, Validation).

## 2. Implementation Strategy

- **Framework**: Jest + ts-jest
- **Mocking**: Extensive use of `jest.mock()` to isolate services from:
  - File System (`fs/promises`)
  - Child Process (`execFile`)
  - Network Calls (`fetch`, API clients)
  - UI Output (`ui-events`)
- **Structure**:
  - Unit Tests: `src/services/__tests__/*.test.ts`
  - Integration Tests: `src/__tests__/integration/*.test.ts`

## 3. Priority 1: Critical Core Services (Days 1-2)

These services are the backbone of the application.

### 3.1 ChatService (`src/services/chat.service.ts`)
**Current**: 0% | **Target**: 80%
**Dependencies**: SessionService, ContextService, ConfigService, ToolService, UI Events.

**Test Scenarios**:
- **Initialization**:
  - `switchProvider`: Successfully initializes provider, handles missing config, handles initialization failure.
  - `switchProviderWithFallback`: Iterates through providers on failure.
- **Chat Loop**:
  - `chat`: Throws if no provider/session.
  - `chat` (Standard): Sends message, stores user message, returns response, stores assistant message.
  - `chat` (Streaming): Emits `streaming` events, aggregates chunks.
- **Tool Execution**:
  - Parses tool calls from LLM response.
  - Executes tool via `ToolService`.
  - Submits tool output back to LLM (multi-turn).
  - Enforces `maxSteps` loop limit.
- **Context**:
  - `getEmbedding`: Delegates to provider, handles unsupported providers.

### 3.2 SessionService (`src/services/session.service.ts`)
**Current**: 0% | **Target**: 75%
**Dependencies**: SessionStorage, ConfigService.

**Test Scenarios**:
- **Lifecycle**:
  - `createSession`: Generates UUID, sets timestamp, persists.
  - `loadSession`: Retrieves from storage, handles decryption.
  - `deleteSession`: Removes file, clears current session if matching.
- **Message Management**:
  - `addMessage`: Appends to history, updates `updatedAt`.
  - `getLastNMessages`: Returns correct window, handles empty history.
  - Context Window Management: Trims history based on token limits (mocked tokenizer).

### 3.3 Provider System (`src/providers/*.ts`)
**Current**: 0% | **Target**: 70%

**Test Scenarios**:
- **Factory**: `getProvider` returns correct instance, caches instances.
- **OpenAI/Anthropic/Gemini**:
  - `initialize`: Validates API key.
  - `chat`: Formats messages correctly for specific API.
  - `streamChat`: Yields chunks correctly.
  - Error Mapping: Converts 401/429/500 to standardized errors.
- **Ollama**:
  - `isAvailable`: Pings local endpoint.
  - `embed`: Returns vector array.

## 4. Priority 2: New P2 Features (Day 3)

Validate the recently implemented robustness features.

### 4.1 Error Handler (`src/utils/error-handler.ts`)
**Current**: 0% | **Target**: 90%

**Test Scenarios**:
- **Sanitization**:
  - Removes API keys (sk-...).
  - Removes file paths (/home/user...).
  - Removes IP addresses.
- **Factory Methods**:
  - `fromError`: Correctly maps Node.js errors (ENOENT -> FILE_NOT_FOUND).
  - `createError`: Structurally correct `AppError`.
- **Helpers**:
  - `isRetryable`: Returns true for RateLimit/Network/Timeout.

### 4.2 Validation Schemas (`src/validation/schemas.ts`)
**Current**: 0% | **Target**: 90%

**Test Scenarios**:
- **Tool Arguments**:
  - `write_file`: Rejects `../` (path traversal), rejects >1MB content.
  - `exec`: Rejects `;` `|` (injection chars).
  - `search_code`: Validates query length.
- **Config**:
  - Validates provider config structure.

## 5. Priority 3: Advanced Features (Day 4)

### 5.1 RAGService (`src/services/rag.service.ts`)
**Current**: 0% | **Target**: 70%

**Test Scenarios**:
- **Indexing**:
  - Walks directory structure.
  - Ignores `.gitignore` files.
  - Chunks content.
  - Calls `getEmbedding`.
  - Stores in VectorService.
- **Retrieval**:
  - `query`: Embeds query, searches vector store, formats context string.

### 5.2 MCPService (`src/services/mcp.service.ts`)
**Current**: ~9% | **Target**: 60%

**Test Scenarios**:
- **Connection**:
  - Spawns transport (stdio).
  - Handshakes protocol version.
- **Tools**:
  - `listTools`: Maps MCP tools to internal Tool format.
  - `callTool`: Forwards arguments, returns result.

## 6. Execution Schedule

| Phase | Component | Estimated Effort |
|-------|-----------|------------------|
| **1** | `ChatService` & `SessionService` | 8 Hours |
| **2** | `ProviderFactory` & Providers | 6 Hours |
| **3** | `ErrorHandler` & `Validation` | 4 Hours |
| **4** | `RAGService` & `MCPService` | 6 Hours |
| **5** | Integration & Polish | 4 Hours |

## 7. Next Immediate Action

Start with **Phase 1: ChatService**. The existing test file `src/services/__tests__/chat.service.test.ts` exists but has 0% coverage due to mocking issues. It needs to be refactored to properly mock the new `ui-events` system and `SessionService`.
