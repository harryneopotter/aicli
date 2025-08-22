const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CORE_SERVERS = [
  '@modelcontextprotocol/server-filesystem',
  '@modelcontextprotocol/server-git',
  '@modelcontextprotocol/server-memory',
  '@modelcontextprotocol/server-brave-search',
];

const OPTIONAL_SERVERS = [
  '@modelcontextprotocol/server-fetch',
  '@modelcontextprotocol/server-sqlite',
  '@modelcontextprotocol/server-sequential-thinking',
  '@modelcontextprotocol/server-github',
  '@modelcontextprotocol/server-puppeteer',
  '@modelcontextprotocol/server-postgres',
  '@modelcontextprotocol/server-docker',
  '@modelcontextprotocol/server-kubernetes',
  '@modelcontextprotocol/server-sentry',
  '@modelcontextprotocol/server-youtube-transcript',
  'context7-mcp-server',
  'everything-mcp',
  'everart-mcp',
];

function isPackageInstalled(packageName) {
  try {
    require.resolve(packageName);
    return true;
  } catch (err) {
    return false;
  }
}

async function installMCPServers() {
  console.log('🚀 Installing MCP servers for AI Agent...\n');

  const mcpDir = path.join(process.cwd(), '.mcp');
  if (!fs.existsSync(mcpDir)) {
    fs.mkdirSync(mcpDir, { recursive: true });
  }

  const installPackage = (packageName) => {
    if (isPackageInstalled(packageName)) {
      console.log(`  ✅ ${packageName} is already installed.`);
      return;
    }
    try {
      console.log(`  Installing ${packageName}...`);
      execSync(`npm install ${packageName}`, { stdio: 'pipe' });
      console.log(`  ✅ ${packageName} installed successfully.`);
    } catch (error) {
      console.error(`  ❌ Failed to install ${packageName}.`);
    }
  };

  console.log('📦 Installing core MCP servers...');
  CORE_SERVERS.forEach(installPackage);

  const installOptional = process.argv.includes('--with-optional');
  if (installOptional) {
    console.log('\n🔧 Installing optional MCP servers...');
    OPTIONAL_SERVERS.forEach(installPackage);
  } else {
    console.log('\nℹ️ To install optional servers, run this script with the --with-optional flag.');
  }

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
