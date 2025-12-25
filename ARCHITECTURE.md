# AiCli Architecture & Features

## 1. Overview
**AiCli** is a production-ready, standalone command-line coding assistant designed to bring the power of Large Language Models (LLMs) directly into your terminal. It supports both local (Ollama) and cloud-based (OpenAI, Anthropic, Gemini, GLM) models, enabling developers to chat with their codebase, generate code, and automate tasks securely.

## 2. Core Architecture

The application is built as a modular TypeScript Node.js application, following a service-oriented architecture.

### 2.1. Entry Point & CLI Loop
- **`src/cli.ts`**: The main entry point. It uses `commander` to parse arguments and `inquirer` for interactive prompts.
- **REPL Loop**: Once started, it enters a Read-Eval-Print Loop (REPL) where users can type natural language queries or slash commands (e.g., `/help`, `/save`).
- **Event-Driven UI**: The UI is decoupled from logic using an `EventEmitter` (`uiEvents`). Services emit events (loading, message, error), and the `uiRenderer` handles the display.

### 2.2. Service Layer
The core logic is distributed across specialized services:

| Service | Responsibility |
|---------|----------------|
| **ChatService** | Manages the conversation loop, provider switching, and the "Thought-Action-Observation" agent cycle. |
| **SessionService** | Handles chat history, persistence (JSON/SQLite), and session management (save/load/export). |
| **ContextService** | Manages file I/O, project context injection, and system prompt construction. |
| **ToolService** | Registers and executes tools (e.g., `read_file`, `exec_command`). Handles the JSON-based tool protocol. |
| **MCPService** | Implements the **Model Context Protocol** to connect with external tool servers. |
| **RAGService** | Provides semantic search capabilities using an in-memory vector store (persisted to disk). |
| **AnalysisService** | Performs static code analysis for security vulnerabilities and complexity metrics. |
| **SecurityService** | Handles encryption of sensitive data and secure storage of API keys using system keychains. |
| **TrainingService** | Enables self-improvement by learning from successful problem-solving sessions and creating reusable "playbooks". |
| **OnboardingService** | Manages the first-run experience, guiding users through provider configuration and setup. |
| **AgentService** | Loads and manages specialized agent personas (e.g., "Senior Developer", "QA Engineer") defined in Markdown files. |

### 2.3. Provider Abstraction
AiCli uses a factory pattern (`ProviderFactory`) to support multiple LLM backends seamlessly:
- **Local**: Ollama (Llama 3, Mistral, etc.)
- **Cloud**: OpenAI (GPT-4), Anthropic (Claude 3.5), Google (Gemini 1.5), GLM.
- **Fallback Mechanism**: Automatically switches to alternative providers if the primary one fails.

## 3. Key Features & Utility

### 3.1. Agentic Capabilities ("Thought-Action-Observation")
Unlike simple chat bots, AiCli acts as an autonomous agent.
1.  **Thought**: The LLM analyzes the user's request and decides if it needs to use a tool.
2.  **Action**: It generates a structured JSON tool call (e.g., `{ "name": "read_file", "args": { "path": "src/index.ts" } }`).
3.  **Observation**: The `ToolService` executes the tool and feeds the output back to the LLM.
4.  **Response**: The LLM uses the tool output to answer the user's question.

### 3.2. Model Context Protocol (MCP) Support
AiCli is an **MCP Client**. It can connect to any MCP-compliant server to extend its capabilities dynamically.
- **Command**: `/mcp connect <name> <command>`
- **Utility**: Allows the agent to access external databases, APIs, or specialized tools without modifying the core CLI code.

### 3.3. Retrieval-Augmented Generation (RAG)
- **Command**: `/index`
- **Functioning**: Scans the codebase, generates embeddings (using the active provider), and stores them in a local vector index.
- **Utility**: Enables the agent to answer questions about the entire codebase, not just the files currently in the context window.

### 3.4. Smart Context Management
- **Tokenizer**: Automatically estimates token usage.
- **Optimization**: Prunes chat history and context to fit within the model's context window (`maxContextTokens`), ensuring conversations don't crash due to length.

### 3.5. Security & Reliability
- **Input Validation**: All inputs are validated using `Zod` schemas to prevent injection attacks.
- **Output Sanitization**: Error messages are scrubbed of API keys and sensitive paths.
- **Secure Storage**: API keys are stored in the OS keychain (via `keytar`), not in plain text config files.
- **Dockerized**: Runs in a secure, isolated container environment.

### 3.6. Self-Improvement (Training)
- **Command**: `/train`
- **Functioning**: The agent can "reflect" on its own successful solutions to generate reusable strategies (stored as JSON playbooks).
- **Utility**: Over time, the agent builds a library of proven patterns for your specific codebase, which can be exported as new Agent Personas.

### 3.7. Specialized Agent Personas
- **Command**: `/agent <name>`
- **Functioning**: Loads a Markdown file from the `agents/` directory containing a specific system prompt and set of rules.
- **Utility**: Allows switching "hats" (e.g., switching from a "Coder" to a "Project Manager" or "Security Auditor") to get different perspectives on the same problem.

## 4. Data Flow

1.  **User Input**: User types "Refactor src/utils.ts" in the CLI.
2.  **Command Handling**: `CommandHandler` checks if it's a slash command. If not, it passes it to `ChatService`.
3.  **Context Building**: `ContextService` gathers relevant files and project info. `RAGService` may inject relevant code snippets.
4.  **LLM Request**: `ChatService` sends the prompt + context to the active Provider (e.g., Ollama).
5.  **Agent Loop**:
    *   LLM responds with a tool call: `read_file("src/utils.ts")`.
    *   `ToolService` executes the read.
    *   Content is sent back to LLM.
    *   LLM responds with the refactored code.
6.  **Rendering**: `uiRenderer` streams the response to the terminal with syntax highlighting.

## 5. Directory Structure

```
src/
├── cli.ts              # Entry point
├── commands/           # Slash command handlers (/help, /save, etc.)
├── services/           # Core business logic (Chat, Session, Tool, etc.)
├── providers/          # LLM adapters (Ollama, OpenAI, etc.)
├── ui/                 # Terminal rendering logic
├── utils/              # Helpers (Tokenizer, Validator, ErrorHandler)
└── validation/         # Zod schemas
```
