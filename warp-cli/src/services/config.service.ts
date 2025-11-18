import { z } from 'zod';
// Zod schema for config validation
const ProviderConfigSchema = z.object({
  model: z.string().min(1).optional(),
  endpoint: z.string().url().optional(),
  apiKey: z.string().min(1).optional()
});

const ConfigSchema = z.object({
  defaultProvider: z.enum(['ollama', 'openai', 'anthropic', 'gemini']),
  providers: z.object({
    ollama: ProviderConfigSchema.optional(),
    openai: ProviderConfigSchema.optional(),
    anthropic: ProviderConfigSchema.optional(),
    gemini: ProviderConfigSchema.optional(),
  }),
  ui: z.object({
    theme: z.enum(['dark', 'light']),
    markdown: z.boolean(),
    streaming: z.boolean()
  }),
  context: z.object({
    maxHistory: z.number().int().min(1),
    includeGit: z.boolean(),
    includeFiles: z.boolean(),
    autoContext: z.boolean()
  }),
  session: z.object({
    autosave: z.boolean(),
    directory: z.string()
  })
});
import Conf from 'conf';
import * as path from 'path';
import * as os from 'os';
import { Config, ProviderName, ProviderSettings } from '../types';

export class ConfigService {
  private config: Conf<Config>;
  private defaultConfig: Config = {
    defaultProvider: 'ollama',
    providers: {
      ollama: {
        endpoint: 'http://localhost:11434',
        model: 'llama3.2'
      }
    },
    ui: {
      theme: 'dark',
      markdown: true,
      streaming: true
    },
    context: {
      maxHistory: 50,
      includeGit: true,
      includeFiles: true,
      autoContext: true
    },
    session: {
      autosave: true,
      directory: path.join(os.homedir(), '.warp-cli', 'sessions')
    }
  };

  constructor() {
    this.config = new Conf<Config>({
      projectName: 'warp-cli',
      defaults: this.defaultConfig
    });
    // Validate config on load
    this.validateConfig(this.config.store);
  }
  validateConfig(config: any): void {
    try {
      ConfigSchema.parse(config);
    } catch (err: any) {
      throw new Error('Invalid configuration: ' + (err?.message || err));
    }
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config.get(key);
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.config.set(key, value);
    // Validate the updated configuration
    this.validateConfig(this.config.store);
  }

  getAll(): Config {
    return this.config.store;
  }

  reset(): void {
    this.config.clear();
    this.config.store = this.defaultConfig;
  }


  getProviderConfig(provider: ProviderName): ProviderSettings | undefined {
    const providerEntry = this.config.get('providers')[provider];
    if (!providerEntry) return undefined;
    const { apiKey, ...rest } = providerEntry;
    return rest;
  }


  setProviderConfig(
    provider: ProviderName,
    config: ProviderSettings
  ): void {
    // Remove apiKey if present
    const providers = this.config.get('providers');
    const sanitizedConfig = { ...config };
    if ('apiKey' in sanitizedConfig) {
      delete sanitizedConfig.apiKey;
    }
    providers[provider] = sanitizedConfig;
    this.config.set('providers', providers);
  }

  // Helper to migrate existing apiKeys to secure storage
  async migrateApiKeysToSecureStorage(secureConfigService: any) {
    const providers = this.config.get('providers');
    for (const provider of ['openai', 'anthropic', 'gemini'] as ProviderName[]) {
      const conf = providers[provider];
      if (conf && conf.apiKey) {
        await secureConfigService.setApiKey(provider, conf.apiKey);
        delete conf.apiKey;
        providers[provider] = conf;
      }
    }
    this.config.set('providers', providers);
  }

  getSessionDirectory(): string {
    return this.config.get('session').directory;
  }

  isProviderConfigured(provider: ProviderName): boolean {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) return false;

    if (provider === 'ollama') {
      return !!(providerConfig as any).endpoint;
    } else {
      return true;
    }
  }

  exportConfig(): string {
    return JSON.stringify(this.config.store, null, 2);
  }

  importConfig(configString: string): void {
    try {
      const importedConfig = JSON.parse(configString);
      this.validateConfig(importedConfig);
      this.config.store = { ...this.defaultConfig, ...importedConfig };
    } catch (error) {
      const message = (error as any)?.message || String(error);
      throw new Error('Invalid configuration format: ' + message);
    }
  }
}
