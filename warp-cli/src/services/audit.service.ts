import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sanitizeErrorMessage } from '../utils/security';

export interface AuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource?: string;
  status: 'success' | 'failure' | 'warning';
  details?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  private logFile: string;
  private logBuffer: AuditLog[] = [];
  private maxBufferSize = 100;

  constructor() {
    const logDir = path.join(os.homedir(), '.warp-cli', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFile = path.join(logDir, 'audit.log');
  }

  /**
   * Logs an audit event
   * @param event The audit event to log
   */
  async log(event: Omit<AuditLog, 'timestamp' | 'userId'>): Promise<void> {
    const auditLog: AuditLog = {
      timestamp: new Date(),
      userId: this.getUserId(),
      ...event
    };

    // Add to buffer
    this.logBuffer.push(auditLog);

    // Write to file if buffer is full or on critical events
    if (this.logBuffer.length >= this.maxBufferSize || event.status === 'failure') {
      await this.flush();
    }
  }

  /**
   * Logs a command execution event
   * @param command The command executed
   * @param status Success or failure
   * @param details Additional details
   * @param error Error message if failed
   */
  async logCommandExecution(
    command: string,
    status: 'success' | 'failure' | 'warning',
    details?: string,
    error?: string
  ): Promise<void> {
    await this.log({
      action: 'command_execution',
      resource: command,
      status,
      details,
      error: error ? sanitizeErrorMessage(error) : undefined,
      metadata: {
        cwd: process.cwd(),
        shell: process.env.SHELL || 'unknown'
      }
    });
  }

  /**
   * Logs a session operation
   * @param operation The operation (create, load, save, delete)
   * @param sessionId The session ID
   * @param status Success or failure
   * @param error Error message if failed
   */
  async logSessionOperation(
    operation: string,
    sessionId: string,
    status: 'success' | 'failure',
    error?: string
  ): Promise<void> {
    await this.log({
      action: `session_${operation}`,
      resource: sessionId,
      status,
      error: error ? sanitizeErrorMessage(error) : undefined
    });
  }

  /**
   * Logs a configuration change
   * @param configKey The configuration key changed
   * @param status Success or failure
   * @param error Error message if failed
   */
  async logConfigChange(
    configKey: string,
    status: 'success' | 'failure',
    error?: string
  ): Promise<void> {
    await this.log({
      action: 'config_change',
      resource: configKey,
      status,
      error: error ? sanitizeErrorMessage(error) : undefined
    });
  }

  /**
   * Logs an authentication event
   * @param provider The provider being authenticated
   * @param status Success or failure
   * @param error Error message if failed
   */
  async logAuthentication(
    provider: string,
    status: 'success' | 'failure',
    error?: string
  ): Promise<void> {
    await this.log({
      action: 'authentication',
      resource: provider,
      status,
      error: error ? sanitizeErrorMessage(error) : undefined
    });
  }

  /**
   * Logs a security event
   * @param eventType The type of security event
   * @param details Details about the event
   * @param severity The severity level
   */
  async logSecurityEvent(
    eventType: string,
    details: string,
    severity: 'success' | 'failure' | 'warning' = 'warning'
  ): Promise<void> {
    await this.log({
      action: 'security_event',
      resource: eventType,
      status: severity,
      details: sanitizeErrorMessage(details)
    });
  }

  /**
   * Flushes the log buffer to disk
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logLines = this.logBuffer.map(log => JSON.stringify(log)).join('\n') + '\n';
      await fs.promises.appendFile(this.logFile, logLines, 'utf8');
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to write audit logs:', error);
    }
  }

  /**
   * Gets the current user ID (username@hostname)
   */
  private getUserId(): string {
    const username = os.userInfo().username;
    const hostname = os.hostname();
    return `${username}@${hostname}`;
  }

  /**
   * Retrieves recent audit logs
   * @param limit Maximum number of logs to retrieve
   * @returns Array of recent audit logs
   */
  async getRecentLogs(limit: number = 50): Promise<AuditLog[]> {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = await fs.promises.readFile(this.logFile, 'utf8');
      const lines = content.trim().split('\n');
      const logs = lines
        .slice(-limit)
        .map(line => {
          try {
            const log = JSON.parse(line);
            log.timestamp = new Date(log.timestamp);
            return log as AuditLog;
          } catch {
            return null;
          }
        })
        .filter((log): log is AuditLog => log !== null);

      return logs;
    } catch (error) {
      console.error('Failed to read audit logs:', error);
      return [];
    }
  }

  /**
   * Searches audit logs by action type
   * @param action The action to search for
   * @param limit Maximum number of results
   * @returns Array of matching audit logs
   */
  async searchLogs(action: string, limit: number = 50): Promise<AuditLog[]> {
    const logs = await this.getRecentLogs(1000);
    return logs.filter(log => log.action === action).slice(-limit);
  }

  /**
   * Cleanup method to ensure logs are flushed on exit
   */
  async cleanup(): Promise<void> {
    await this.flush();
  }
}

export const auditService = new AuditService();
