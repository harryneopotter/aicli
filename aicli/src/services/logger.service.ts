import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { configService } from './config.service';

/**
 * Structured logging service using winston
 * Supports multiple log levels, file rotation, and contextual logging
 */
export class LoggerService {
  private logger: winston.Logger;
  private logDir: string;

  constructor() {
    // Get log directory from config or use default
    this.logDir = this.getLogDirectory();
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'aicli' },
      transports: [
        // Error log - only errors
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Combined log - all levels
        new winston.transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...metadata }: any) => {
              let msg = `${timestamp} [${level}]: ${message}`;
              if (Object.keys(metadata).length > 0 && metadata.service !== 'aicli') {
                msg += ` ${JSON.stringify(metadata)}`;
              }
              return msg;
            })
          ),
        })
      );
    }
  }

  private getLogDirectory(): string {
    try {
      const sessionDir = configService.getSessionDirectory();
      return path.join(path.dirname(sessionDir), 'logs');
    } catch {
      // Fallback if config service not available
      const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
      return path.join(homeDir, '.aicli', 'logs');
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, meta?: Record<string, any>): void {
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          ...error,
        },
      }),
    };
    this.logger.error(message, errorMeta);
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): winston.Logger {
    return this.logger.child(context);
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logger.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.logger.level;
  }
}

export const logger = new LoggerService();
