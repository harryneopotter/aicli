# Warp CLI

Warp CLI is a standalone command-line interface (CLI) tool designed to interact with various large language models (LLMs) such as OpenAI, Anthropic, Gemini, and Ollama. It provides a seamless way to integrate AI capabilities into your terminal workflows, with a focus on security, extensibility, and ease of use.

## Features

- **Multi-Provider Support**: Interact with OpenAI, Anthropic, Gemini, and Ollama LLMs.
- **Secure API Key Management**: API keys are securely stored using `keytar`.
- **Rate Limiting**: Prevent API overuse with `bottleneck`-based rate limiting.
- **Config Validation**: Ensure robust configurations with `zod` validation.
- **Structured Error Handling**: Comprehensive error management for better debugging.
- **Session Management**: Persistent sessions for context-aware interactions.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/harryneopotter/aicli.git
   cd warp-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Link the CLI globally (optional):
   ```bash
   npm link
   ```

## Usage

Run the CLI:
```bash
warp-cli
```

## Configuration

Configuration is managed via JSON files. Use the `config` command to set up API keys and other settings:
```bash
warp-cli config set --provider openai --api-key YOUR_API_KEY
```

## Examples

### Chat with OpenAI
```bash
warp-cli chat --provider openai --message "Hello, AI!"
```

### List Available Models
```bash
warp-cli models --provider gemini
```

## Security Improvements

- **RCE Fixes**: Replaced vulnerable `exec` calls with `execFile`.
- **Environment Filtering**: Prevented leakage of sensitive environment variables.
- **Error Sanitization**: Ensured no sensitive data is exposed in error messages.

## Contributing

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add new feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.