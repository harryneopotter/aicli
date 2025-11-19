# Pending Tasks for Warp CLI

This document lists the features from the project vision that are not yet implemented.

## 1. UI Enhancements

### Syntax Highlighting and Gradients
- **Description:** Enhance the terminal UI by adding gradient colors to titles and prompts, and by providing syntax highlighting for code blocks.
- **Implementation:**
  - Install `cli-highlight` and `gradient-string`.
  - Modify `warp-cli/src/ui/renderer.ts` to use these libraries for a more visually appealing and readable interface.

## 2. Advanced Features

### Session Templates
- **Description:** Allow users to create, manage, and start new sessions from pre-configured templates. This is useful for recurring tasks or projects that require a specific setup.
- **Implementation:**
  - Add commands like `/template create`, `/template list`, `/new --template <name>`.
  - Store templates in the configuration or a separate database table.

### Voice Input
- **Description:** Enable hands-free interaction with the CLI using speech-to-text.
- **Implementation:**
  - Integrate a voice recognition library (e.g., `node-mic-record` with a cloud-based speech-to-text API).
  - Add a keybinding (e.g., `Ctrl+V`) to toggle voice input.

### Session Sharing
- **Description:** Allow users to share their chat sessions with others via a secure, read-only link.
- **Implementation:**
  - This is a complex feature that would likely require a backend service to store and serve the shared sessions.
  - The CLI would have a command like `/share` that uploads the session and returns a URL.

## 3. Developer and Security Features

### Audit Logging
- **Description:** Create a detailed, structured log file (`audit.log`) that records all significant events, such as command executions, AI requests, and session management activities.
- **Implementation:**
  - Create a new `AuditService` that can be called from other services.
  - Log events in a structured format (e.g., JSON) for easy parsing and analysis.

### Debug Mode
- **Description:** Add a `--debug` command-line flag to enable verbose logging throughout the application. This will help with troubleshooting and development.
- **Implementation:**
  - Add the `--debug` flag to the `commander` setup in `cli.ts`.
  - Create a simple logging utility that checks if debug mode is enabled before printing messages.
