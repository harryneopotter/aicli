# Tabby AI Agent Plugin 🤖

> Transform your Tabby terminal into an intelligent AI-powered assistant with natural language processing and Model Context Protocol (MCP) integration.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

## 🌟 Features

### 🎯 **Intelligent Terminal Modes**
- **SHELL Mode**: Traditional terminal command execution
- **AI Mode**: Natural language processing with AI responses
- **SMART Mode**: Automatic detection between commands and natural language
- **Seamless Mode Switching**: Use `\\ai`, `\\shell`, `\\toggle` commands

### 🔗 **Model Context Protocol (MCP) Integration**
- **Multiple Server Support**: Connect to various MCP servers simultaneously
- **Priority-Based Execution**: Configure server execution order
- **Health Monitoring**: Real-time server status and performance metrics
- **Dynamic Configuration**: Add/remove servers without restart
- **Auto-Restart**: Automatic recovery from server failures

### 🧠 **Context-Aware AI**
- **Project Detection**: Automatic recognition of Node.js, Python, Go, and other projects
- **Git Integration**: Real-time Git status and branch information
- **Command History**: AI learns from your command patterns
- **Working Directory Awareness**: Context-sensitive responses
- **Terminal Output Analysis**: AI can analyze and explain command results

### ♿ **Accessibility Features**
- **Screen Reader Support**: Full ARIA compliance
- **Keyboard Navigation**: Complete keyboard-only operation
- **High Contrast Support**: Enhanced visibility options
- **Focus Management**: Logical tab order and focus indicators

## 📦 Installation

### Prerequisites

- **Tabby Terminal**: Version 1.0.0 or higher
- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 7.0.0 or higher

### Method 1: Install from Tabby Plugin Manager (Recommended)

1. **Open Tabby Terminal**
2. **Go to Settings** → **Plugins**
3. **Search for "AI Agent"**
4. **Click Install**
5. **Restart Tabby**

### Method 2: Manual Installation

1. **Download the Plugin**
   ```bash
   git clone https://github.com/your-username/tabby-ai-agent.git
   cd tabby-ai-agent
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Plugin**
   ```bash
   npm run build
   ```

4. **Install in Tabby**
   
   **Option A: Copy to Plugins Directory**
   ```bash
   # Windows
   copy dist\index.js "%APPDATA%\tabby\plugins\ai-agent\index.js"
   
   # macOS
   cp dist/index.js ~/Library/Application\ Support/tabby/plugins/ai-agent/index.js
   
   # Linux
   cp dist/index.js ~/.config/tabby/plugins/ai-agent/index.js
   ```
   
   **Option B: Symlink for Development**
   ```bash
   # Windows (Run as Administrator)
   mklink /D "%APPDATA%\tabby\plugins\ai-agent" "%CD%"
   
   # macOS/Linux
   ln -s "$(pwd)" ~/Library/Application\ Support/tabby/plugins/ai-agent
   ```

5. **Restart Tabby Terminal**

### Method 3: Development Installation

1. **Clone and Setup**
   ```bash
   git clone https://github.com/your-username/tabby-ai-agent.git
   cd tabby-ai-agent
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Link to Tabby** (see Method 2, Option B)

## ⚙️ Configuration

### Initial Setup

1. **Open Tabby Settings** → **Plugins** → **AI Agent**

2. **Configure AI Provider**
   ```json
   {
     "aiProvider": "openai",
     "apiKey": "your-api-key-here",
     "model": "gpt-4",
     "maxTokens": 2000
   }
   ```

3. **Add MCP Servers**
   ```json
   {
     "mcpServers": [
       {
         "name": "filesystem",
         "command": "npx",
         "args": ["@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
         "priority": 1,
         "enabled": true
       },
       {
         "name": "git",
         "command": "npx",
         "args": ["@modelcontextprotocol/server-git"],
         "priority": 2,
         "enabled": true
       }
     ]
   }
   ```

### Advanced Configuration

```json
{
  "aiAgent": {
    "debug": false,
    "logLevel": "info",
    "defaultMode": "smart",
    "performance": {
      "enableCaching": true,
      "cacheSize": 100,
      "cacheTTL": 300000
    },
    "context": {
      "includeGitStatus": true,
      "includeProjectType": true,
      "maxHistoryItems": 50
    },
    "accessibility": {
      "screenReaderSupport": true,
      "highContrast": false,
      "keyboardNavigation": true
    }
  }
}
```

## 🚀 Usage

### Mode Switching

```bash
# Switch to AI mode
\\ai

# Switch to Shell mode  
\\shell

# Toggle between modes
\\toggle

# Check current mode
\\status
```

### AI Mode Examples

```bash
# Natural language commands
"list all files in the current directory"
"what's my git status?"
"explain this error message"
"create a new React component called Button"
"show me the largest files in this folder"
"what dependencies does this project have?"
```

### Shell Mode Examples

```bash
# Regular terminal commands
ls -la
git status
npm install
cd projects
vim config.json
```

### Smart Mode (Default)

Smart mode automatically detects whether your input is a command or natural language:

```bash
# Detected as command
ls -la
git commit -m "fix bug"

# Detected as natural language
"what files were changed in the last commit?"
"how do I install dependencies?"
```

### MCP Integration

The AI can use MCP servers to perform actions:

```bash
# With filesystem MCP server
"create a new file called todo.txt with my tasks"
"read the contents of package.json"

# With git MCP server
"show me the commit history"
"create a new branch called feature-auth"

# With web MCP server
"search for React documentation"
"fetch the latest news about AI"
```

## 🔧 Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/your-username/tabby-ai-agent.git
cd tabby-ai-agent

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Build for production
npm run build
```

### Project Structure

```
tabby-ai-agent/
├── src/
│   ├── components/          # Angular components
│   │   └── ai-terminal.component.ts
│   ├── services/           # Core services
│   │   ├── ai-agent.service.ts
│   │   ├── mcp-client.service.ts
│   │   └── context-manager.service.ts
│   ├── utils/              # Utility functions
│   │   ├── cache.ts
│   │   ├── debug.ts
│   │   └── mode-detector.ts
│   ├── errors.ts           # Error classes
│   └── plugin.ts           # Main plugin entry
├── tests/                  # Test files
├── scripts/                # Build scripts
├── config-schema.json      # Configuration schema
└── webpack.config.js       # Build configuration
```

### Adding New Features

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Implement Feature**
   - Add service logic in `src/services/`
   - Add components in `src/components/`
   - Add tests in `tests/`

3. **Test Feature**
   ```bash
   npm test
   npm run lint
   ```

4. **Submit Pull Request**

## 🐛 Troubleshooting

### Common Issues

#### Plugin Not Loading

**Symptoms**: Plugin doesn't appear in Tabby

**Solutions**:
1. Check Tabby version compatibility
2. Verify plugin is in correct directory
3. Restart Tabby completely
4. Check console for error messages

```bash
# Check plugin directory
# Windows
dir "%APPDATA%\tabby\plugins"

# macOS/Linux
ls ~/Library/Application\ Support/tabby/plugins/
```

#### AI Not Responding

**Symptoms**: AI mode active but no responses

**Solutions**:
1. Verify API key configuration
2. Check internet connection
3. Validate AI provider settings
4. Enable debug mode

```json
{
  "aiAgent": {
    "debug": true,
    "logLevel": "debug"
  }
}
```

#### MCP Servers Not Working

**Symptoms**: MCP tools not available to AI

**Solutions**:
1. Check server configuration
2. Verify server installation
3. Test server connectivity
4. Review server logs

```bash
# Test MCP server manually
npx @modelcontextprotocol/server-filesystem /path/to/test
```

#### Performance Issues

**Symptoms**: Slow responses or high memory usage

**Solutions**:
1. Enable response caching
2. Reduce context history size
3. Disable unnecessary MCP servers
4. Lower AI model complexity

```json
{
  "performance": {
    "enableCaching": true,
    "cacheSize": 50,
    "cacheTTL": 600000
  },
  "context": {
    "maxHistoryItems": 25
  }
}
```

### Debug Mode

Enable debug mode for detailed logging:

```json
{
  "aiAgent": {
    "debug": true,
    "logLevel": "debug"
  }
}
```

Logs will appear in:
- **Windows**: `%APPDATA%\tabby\logs\`
- **macOS**: `~/Library/Logs/tabby/`
- **Linux**: `~/.config/tabby/logs/`

### Getting Help

1. **Check Documentation**: Review this README and inline code comments
2. **Search Issues**: Look for similar problems in GitHub issues
3. **Enable Debug Mode**: Gather detailed logs before reporting
4. **Create Issue**: Provide reproduction steps and system info

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes and add tests**
4. **Ensure tests pass**: `npm test`
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open Pull Request**

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Standard configuration
- **Prettier**: Automatic formatting
- **Tests**: Jest with 80%+ coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tabby Terminal**: For providing an excellent extensible terminal
- **Model Context Protocol**: For enabling AI tool integration
- **OpenAI**: For powerful language models
- **Contributors**: Everyone who has contributed to this project

## 📈 Roadmap

### Version 1.1.0
- [ ] Plugin marketplace integration
- [ ] Custom AI provider support
- [ ] Advanced context filtering
- [ ] Multi-language support

### Version 1.2.0
- [ ] Visual AI responses (charts, diagrams)
- [ ] Voice input/output
- [ ] Collaborative features
- [ ] Cloud synchronization

### Version 2.0.0
- [ ] AI-powered terminal automation
- [ ] Custom MCP server creation tools
- [ ] Advanced analytics and insights
- [ ] Enterprise features

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/your-username/tabby-ai-agent/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/tabby-ai-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/tabby-ai-agent/discussions)
- **Email**: support@tabby-ai-agent.com

---

**Made with ❤️ for the Tabby Terminal community**