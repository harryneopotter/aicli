import Conf from "conf";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { Config } from "../types";

export class ConfigService {
  private config: Conf<Config>;
  private defaultConfig: Config = {
    defaultProvider: "ollama",
    providers: {
      ollama: {
        endpoint: "http://localhost:11434",
        model: "llama3.2",
      },
    },
    ui: {
      theme: "default",
      markdown: true,
      streaming: true,
    },
    context: {
      maxHistory: 50,
      includeGit: true,
      includeFiles: true,
      autoContext: true,
    },
    session: {
      autosave: true,
      directory: path.join(os.homedir(), ".warp-cli", "sessions"),
    },
  };

  private readonly defaultThemeColors = {
    primary: "#00FFFF",
    secondary: "#FF00FF",
    success: "#00FF00",
    error: "#FF0000",
    warning: "#FFFF00",
    info: "#0000FF",
  };

  constructor() {
    this.config = new Conf<Config>({
      projectName: "warp-cli",
      defaults: this.defaultConfig,
    });
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config.get(key);
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.config.set(key, value);
  }

  getAll(): Config {
    return this.config.store;
  }

  reset(): void {
    this.config.clear();
    this.config.store = this.defaultConfig;
  }

  getProviderConfig(provider: "ollama" | "openai" | "anthropic" | "gemini") {
    return this.config.get("providers")[provider];
  }

  setProviderConfig(
    provider: "ollama" | "openai" | "anthropic" | "gemini",
    config: any,
  ): void {
    const providers = this.config.get("providers");
    providers[provider] = config;
    this.config.set("providers", providers);
  }

  getSessionDirectory(): string {
    return this.config.get("session").directory;
  }

  isProviderConfigured(
    provider: "ollama" | "openai" | "anthropic" | "gemini",
  ): boolean {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) return false;

    if (provider === "ollama") {
      return !!(providerConfig as any).endpoint;
    } else {
      return !!(providerConfig as any).apiKey;
    }
  }

  exportConfig(): string {
    return JSON.stringify(this.config.store, null, 2);
  }

  importConfig(configString: string): void {
    try {
      const importedConfig = JSON.parse(configString);
      this.config.store = { ...this.defaultConfig, ...importedConfig };
    } catch (error) {
      throw new Error("Invalid configuration format");
    }
  }

  getThemeDirectory(): string {
    return path.join(os.homedir(), ".warp-cli", "themes");
  }

  listThemes(): string[] {
    const themeDir = this.getThemeDirectory();
    if (!fs.existsSync(themeDir)) {
      return ["default"];
    }
    const files = fs.readdirSync(themeDir);
    return [
      "default",
      ...files
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(".json", "")),
    ];
  }

  getThemeColors(): Record<string, string> {
    const themeName = this.get("ui").theme;

    if (!themeName || themeName === "default") {
      return this.defaultThemeColors;
    }

    const themePath = path.join(this.getThemeDirectory(), `${themeName}.json`);
    if (!fs.existsSync(themePath)) {
      return this.defaultThemeColors;
    }

    try {
      const rawTheme = fs.readFileSync(themePath, "utf-8");
      const parsedTheme = JSON.parse(rawTheme);
      if (
        parsedTheme &&
        typeof parsedTheme === "object" &&
        parsedTheme.colors
      ) {
        return { ...this.defaultThemeColors, ...parsedTheme.colors };
      }
    } catch {
      // Ignore parse errors and fall back to defaults below
    }

    return this.defaultThemeColors;
  }
}

export const configService = new ConfigService();
