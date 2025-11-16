import Conf from 'conf';
import * as path from 'path';
import * as os from 'os';
import { Config } from '../types';
import { maskSensitiveConfig } from '../utils/security';
import { validateConfig, validateField, formatValidationErrors } from '../utils/config-validator';

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
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config.get(key);
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    // Validate the new value
    const validation = validateField(key, value);

    if (!validation.valid) {
      throw new Error(`Configuration validation failed:\n${formatValidationErrors(validation.errors)}`);
    }

    this.config.set(key, value);
  }

  getAll(maskSensitive: boolean = true): Config {
    const config = this.config.store;
    return maskSensitive ? maskSensitiveConfig(config) : config;
  }

  reset(): void {
    this.config.clear();
    this.config.store = this.defaultConfig;
  }

  getProviderConfig(provider: 'ollama' | 'openai' | 'anthropic' | 'gemini') {
    return this.config.get('providers')[provider];
  }

  setProviderConfig(
    provider: 'ollama' | 'openai' | 'anthropic' | 'gemini',
    config: any
  ): void {
    const providers = this.config.get('providers');
    providers[provider] = config;
    this.config.set('providers', providers);
  }

  getSessionDirectory(): string {
    return this.config.get('session').directory;
  }

  isProviderConfigured(provider: 'ollama' | 'openai' | 'anthropic' | 'gemini'): boolean {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) return false;

    if (provider === 'ollama') {
      return !!(providerConfig as any).endpoint;
    } else {
      return !!(providerConfig as any).apiKey;
    }
  }

  exportConfig(includeSensitive: boolean = false): string {
    const config = includeSensitive ? this.config.store : maskSensitiveConfig(this.config.store);

    if (includeSensitive) {
      console.warn(
        '\n⚠️  WARNING: This export contains sensitive data (API keys, tokens, etc.).\n' +
        '⚠️  Do not share this output publicly or commit it to version control.\n'
      );
    }

    return JSON.stringify(config, null, 2);
  }

  importConfig(configString: string): void {
    try {
      const importedConfig = JSON.parse(configString);

      // Validate the imported config
      const validation = validateConfig(importedConfig);

      if (!validation.valid) {
        throw new Error(`Configuration validation failed:\n${formatValidationErrors(validation.errors)}`);
      }

      this.config.store = { ...this.defaultConfig, ...importedConfig };
    } catch (error: any) {
      if (error.message.includes('validation')) {
        throw error;
      }
      throw new Error('Invalid configuration format: ' + error.message);
    }
  }

  /**
   * Validate current configuration
   * @returns Validation result
   */
  validateCurrentConfig(): { valid: boolean; errors: string } {
    const validation = validateConfig(this.config.store);
    return {
      valid: validation.valid,
      errors: formatValidationErrors(validation.errors)
    };
  }
}

export const configService = new ConfigService();
