export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface DebugConfig {
  enabled: boolean;
  level: LogLevel;
  prefix: string;
  timestamp: boolean;
  colors: boolean;
}

class DebugLogger {
  private config: DebugConfig = {
    enabled: false,
    level: LogLevel.INFO,
    prefix: '[AI-Agent]',
    timestamp: true,
    colors: true
  };

  private colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
    green: '\x1b[32m'
  };

  configure(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    let formatted = '';
    
    if (this.config.timestamp) {
      formatted += `[${new Date().toISOString()}] `;
    }
    
    formatted += `${this.config.prefix} `;
    
    if (this.config.colors) {
      const levelColors = {
        [LogLevel.ERROR]: this.colors.red,
        [LogLevel.WARN]: this.colors.yellow,
        [LogLevel.INFO]: this.colors.blue,
        [LogLevel.DEBUG]: this.colors.gray,
        [LogLevel.TRACE]: this.colors.green
      };
      
      const levelNames = {
        [LogLevel.ERROR]: 'ERROR',
        [LogLevel.WARN]: 'WARN',
        [LogLevel.INFO]: 'INFO',
        [LogLevel.DEBUG]: 'DEBUG',
        [LogLevel.TRACE]: 'TRACE'
      };
      
      formatted += `${levelColors[level]}${levelNames[level]}${this.colors.reset} `;
    }
    
    formatted += message;
    
    if (args.length > 0) {
      formatted += ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.config.enabled || level > this.config.level) {
      return;
    }

    const formatted = this.formatMessage(level, message, ...args);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.log(formatted);
        break;
    }
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  trace(message: string, ...args: any[]): void {
    this.log(LogLevel.TRACE, message, ...args);
  }

  // Performance timing utilities
  time(label: string): void {
    if (this.config.enabled && this.config.level >= LogLevel.DEBUG) {
      console.time(`${this.config.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.config.enabled && this.config.level >= LogLevel.DEBUG) {
      console.timeEnd(`${this.config.prefix} ${label}`);
    }
  }

  // Group logging
  group(label: string): void {
    if (this.config.enabled && this.config.level >= LogLevel.DEBUG) {
      console.group(`${this.config.prefix} ${label}`);
    }
  }

  groupEnd(): void {
    if (this.config.enabled && this.config.level >= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }

  // Conditional logging
  assert(condition: boolean, message: string, ...args: any[]): void {
    if (!condition) {
      this.error(`Assertion failed: ${message}`, ...args);
    }
  }

  // Get current configuration
  getConfig(): DebugConfig {
    return { ...this.config };
  }

  // Enable/disable logging
  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

// Export convenience functions
export const debug = {
  error: (message: string, ...args: any[]) => debugLogger.error(message, ...args),
  warn: (message: string, ...args: any[]) => debugLogger.warn(message, ...args),
  info: (message: string, ...args: any[]) => debugLogger.info(message, ...args),
  debug: (message: string, ...args: any[]) => debugLogger.debug(message, ...args),
  trace: (message: string, ...args: any[]) => debugLogger.trace(message, ...args),
  time: (label: string) => debugLogger.time(label),
  timeEnd: (label: string) => debugLogger.timeEnd(label),
  group: (label: string) => debugLogger.group(label),
  groupEnd: () => debugLogger.groupEnd(),
  assert: (condition: boolean, message: string, ...args: any[]) => debugLogger.assert(condition, message, ...args),
  configure: (config: Partial<DebugConfig>) => debugLogger.configure(config),
  enable: () => debugLogger.enable(),
  disable: () => debugLogger.disable(),
  setLevel: (level: LogLevel) => debugLogger.setLevel(level)
};