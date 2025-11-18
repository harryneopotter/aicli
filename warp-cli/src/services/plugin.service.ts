import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ContextData, PluginRunResult, PluginSummary, WarpPlugin } from '../types';

interface LoadedPlugin extends WarpPlugin {
  source: 'builtin' | 'external';
  filePath?: string;
}

export class PluginService {
  private readonly pluginDir: string;
  private plugins = new Map<string, LoadedPlugin>();

  constructor(pluginDir = path.join(os.homedir(), '.warp-cli', 'plugins')) {
    this.pluginDir = pluginDir;
  }

  async initialize(): Promise<void> {
    await fs.promises.mkdir(this.pluginDir, { recursive: true });
    this.registerBuiltins();
    await this.loadExternalPlugins();
  }

  listPlugins(): PluginSummary[] {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      source: plugin.source
    }));
  }

  async execute(name: string, args: string[], context: ContextData): Promise<PluginRunResult> {
    const plugin = this.plugins.get(name.toLowerCase());
    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`);
    }

    const result = await plugin.run(args, context);
    if (typeof result === 'string') {
      return { output: result };
    }
    return result || { output: 'Plugin executed without output.' };
  }

  reload(): Promise<void> {
    this.plugins.clear();
    return this.initialize();
  }

  private registerBuiltins(): void {
    const builtins: WarpPlugin[] = [
      {
        name: 'context-digest',
        description: 'Summarize current working context, git state, and attachments.',
        version: '1.0.0',
        author: 'Warp CLI',
        run: async (_args, context) => {
          const lines: string[] = [];
          lines.push(`Directory: ${context.cwd}`);
          if (context.git) {
            lines.push(`Git: ${context.git.branch} (${context.git.status})`);
          }
          if (context.project) {
            lines.push(`Project: ${context.project.type} — ${context.project.name}@${context.project.version}`);
          }
          if (context.files?.length) {
            lines.push(`Attachments: ${context.files.map(f => f.path).join(', ')}`);
          } else {
            lines.push('Attachments: none');
          }
          if (context.history.commands.length) {
            lines.push('Recent Commands:');
            context.history.commands.slice(-5).forEach((cmd, idx) => {
              lines.push(` ${idx + 1}. ${cmd}`);
            });
          }
          return { output: lines.join('\n') };
        }
      }
    ];

    builtins.forEach(plugin => this.register(plugin, 'builtin'));
  }

  private async loadExternalPlugins(): Promise<void> {
    const entries = await fs.promises.readdir(this.pluginDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name);
      if (!['.js', '.cjs', '.mjs'].includes(ext)) continue;
      const filePath = path.join(this.pluginDir, entry.name);
      await this.loadPluginFile(filePath);
    }
  }

  private async loadPluginFile(filePath: string): Promise<void> {
    try {
      delete require.cache[require.resolve(filePath)];
      const mod = require(filePath);
      const plugin: WarpPlugin | undefined = mod.default || mod.plugin || mod;
      if (!plugin?.name || typeof plugin.run !== 'function') {
        console.warn(`Invalid plugin at ${filePath}`);
        return;
      }
      this.register(plugin, 'external', filePath);
    } catch (error) {
      console.warn(`Failed to load plugin ${filePath}:`, error);
    }
  }

  private register(plugin: WarpPlugin, source: 'builtin' | 'external', filePath?: string): void {
    const normalizedName = plugin.name.toLowerCase();
    this.plugins.set(normalizedName, {
      ...plugin,
      source,
      filePath
    });
  }
}
