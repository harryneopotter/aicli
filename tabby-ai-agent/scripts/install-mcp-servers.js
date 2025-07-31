const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MCP_SERVERS = [
  // Core servers
  '@modelcontextprotocol/server-filesystem',
  '@modelcontextprotocol/server-git', 
  '@modelcontextprotocol/server-memory',
  '@modelcontextprotocol/server-brave-search',
  '@modelcontextprotocol/server-fetch',
  '@modelcontextprotocol/server-sqlite',
  
  // Advanced servers
  '@modelcontextprotocol/server-sequential-thinking',
  '@modelcontextprotocol/server-github',
  '@modelcontextprotocol/server-puppeteer',
  
  // Specialized servers
  'context7-mcp-server',
  'everything-mcp',
  'everart-mcp'
];

const OPTIONAL_SERVERS = [
  '@modelcontextprotocol/server-postgres',
  '@modelcontextprotocol/server-docker',
  '@modelcontextprotocol/server-kubernetes',
  '@modelcontextprotocol/server-sentry',
  '@modelcontextprotocol/server-youtube-transcript'
];

async function installMCPServers() {
  console.log('🚀 Installing MCP servers for AI Agent...\n');
  
  // Create MCP config directory
  const mcpDir = path.join(process.cwd(), '.mcp');
  if (!fs.existsSync(mcpDir)) {
    fs.mkdirSync(mcpDir, { recursive: true });
  }

  // Install core servers
  console.log('📦 Installing core MCP servers...');
  for (const server of MCP_SERVERS) {
    try {
      console.log(`  Installing ${server}...`);
      execSync(`npm install -g ${server}`, { stdio: 'pipe' });
      console.log(`  ✅ ${server} installed`);
    } catch (error) {
      console.log(`  ⚠️  ${server} failed (will try alternative)`);
    }
  }

  // Install optional servers (non-blocking)
  console.log('\n🔧 Installing optional MCP servers...');
  for (const server of OPTIONAL_SERVERS) {
    try {
      console.log(`  Installing ${server}...`);
      execSync(`npm install -g ${server}`, { stdio: 'pipe' });
      console.log(`  ✅ ${server} installed`);
    } catch (error) {
      console.log(`  ⏭️  ${server} skipped (optional)`);
    }
  }

  // Create MCP configuration file
  const mcpConfig = {
    mcpServers: {
      filesystem: {
        command: "npx",
        args: ["@modelcontextprotocol/server-filesystem", process.cwd()],
        env: {}
      },
      git: {
        command: "npx", 
        args: ["@modelcontextprotocol/server-git"],
        env: {}
      },
      memory: {
        command: "npx",
        args: ["@modelcontextprotocol/server-memory"],
        env: {}
      },
      "brave-search": {
        command: "npx",
        args: ["@modelcontextprotocol/server-brave-search"],
        env: {
          BRAVE_API_KEY: process.env.BRAVE_API_KEY || ""
        }
      },
      "sequential-thinking": {
        command: "npx",
        args: ["@modelcontextprotocol/server-sequential-thinking"],
        env: {}
      }
    }
  };

  fs.writeFileSync(
    path.join(mcpDir, 'config.json'), 
    JSON.stringify(mcpConfig, null, 2)
  );

  console.log('\n✨ MCP servers installation complete!');
  console.log('📁 Configuration saved to .mcp/config.json');
  console.log('\n🔑 Optional: Set environment variables for enhanced features:');
  console.log('  export BRAVE_API_KEY="your_brave_search_key"');
  console.log('  export GITHUB_TOKEN="your_github_token"');
}

if (require.main === module) {
  installMCPServers().catch(console.error);
}

module.exports = { installMCPServers };
