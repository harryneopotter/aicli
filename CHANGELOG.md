# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0-beta] - 2024-05-20

### Added
- **Comprehensive Testing Suite**: Achieved significant test coverage across core services.
  - Added `handlers.test.ts` for CLI command coverage.
  - Added `tokenizer.test.ts` for context optimization logic.
  - Added `ollama.provider.test.ts` for local LLM integration testing.
  - Added `chat.service.test.ts` with robust mocking for UI events.
  - Added `rag.service.integration.test.ts` for vector search and file operations.
- **Input Validation Framework**: Implemented Zod schemas for strict runtime validation of:
  - Tool arguments (exec, read_file, etc.)
  - Provider configurations
  - Session metadata
- **Advanced Error Handling**:
  - Centralized `ErrorHandler` with error codes (AUTH, PROVIDER, SESSION, etc.).
  - Automatic PII redaction (API keys, file paths, IP addresses) in error messages.
  - User-friendly error suggestions and retry logic.
- **Docker Support**:
  - Multi-stage `Dockerfile` (Alpine-based) for minimal image size.
  - `docker-compose.yml` for easy orchestration.
  - `docker-start.sh` helper script.
- **CI/CD Pipeline**: GitHub Actions workflow for linting, testing, building, and security scanning.

### Changed
- **Refactored Services**:
  - `ChatService`: Improved error handling and event emission.
  - `RAGService`: Enhanced file system mocking and vector store integration.
  - `MCPService`: Better tool registration and connection management.
- **Dependency Updates**:
  - Added `zod` for validation.
  - Updated `jest` and `ts-jest` configuration for better ESM support.

### Fixed
- Resolved `TypeError` in `ChatService` related to missing mock methods.
- Fixed `fs` module mocking issues in `RAGService` integration tests.
- Corrected type definitions for `Session` and `Message` interfaces.

## [1.4.0] - 2024-04-15

### Added
- **Model Context Protocol (MCP)**: Support for connecting to external MCP servers (Vision, Web Search).
- **GLM-4 Provider**: Integration with ZhipuAI's GLM-4 model.
- **Keychain Integration**: Secure API key storage using system keychain.

### Changed
- **Session Management**: Encrypted session storage by default.
- **Context Awareness**: Improved git status and project type detection.

## [1.3.0] - 2024-03-10

### Added
- **Agent Personas**: Support for switching between "Coder", "Writer", and custom agents.
- **Training Mode**: `/train` command to improve agent performance with Q&A pairs.

### Fixed
- Windows path handling issues.
- Terminal rendering glitches on resize.
