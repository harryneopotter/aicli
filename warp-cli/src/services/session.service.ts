import { v4 as uuidv4 } from 'uuid';
import { Session, Message, SessionContext } from '../types';
import { SessionStorage } from '../storage/session.storage';
import { contextService } from './context.service';
import { configService } from './config.service';

export class SessionService {
  private currentSession?: Session;
  private storage: SessionStorage;
  private autosaveInterval?: NodeJS.Timeout;

  constructor() {
    const sessionDir = configService.getSessionDirectory();
    this.storage = new SessionStorage(sessionDir);
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();

    // Start autosave if enabled
    if (configService.get('session').autosave) {
      this.startAutosave();
    }
  }

  async createSession(name?: string): Promise<Session> {
    const context = await contextService.getContext();

    const session: Session = {
      id: uuidv4(),
      name: name || `Session ${new Date().toLocaleString()}`,
      created: new Date(),
      updated: new Date(),
      messages: [],
      context: this.convertContextToSessionContext(context)
    };

    this.currentSession = session;
    return session;
  }

  async loadSession(id: string): Promise<Session | null> {
    const session = await this.storage.loadSession(id);
    if (session) {
      this.currentSession = session;
    }
    return session;
  }

  async saveCurrentSession(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session to save');
    }

    this.currentSession.updated = new Date();
    await this.storage.saveSession(this.currentSession);
  }

  async listSessions(): Promise<Session[]> {
    return await this.storage.listSessions();
  }

  async deleteSession(id: string): Promise<void> {
    await this.storage.deleteSession(id);

    if (this.currentSession?.id === id) {
      this.currentSession = undefined;
    }
  }

  async searchSessions(query: string): Promise<Session[]> {
    return await this.storage.searchSessions(query);
  }

  getCurrentSession(): Session | undefined {
    return this.currentSession;
  }

  addMessage(role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, any>): Message {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const message: Message = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    this.currentSession.messages.push(message);
    this.currentSession.updated = new Date();

    return message;
  }

  getMessages(): Message[] {
    return this.currentSession?.messages || [];
  }

  getLastNMessages(n: number): Message[] {
    const messages = this.getMessages();
    return messages.slice(-n);
  }

  clearMessages(): void {
    if (this.currentSession) {
      this.currentSession.messages = [];
      this.currentSession.updated = new Date();
    }
  }

  async updateContext(): Promise<void> {
    if (!this.currentSession) return;

    const context = await contextService.getContext();
    this.currentSession.context = this.convertContextToSessionContext(context);
  }

  private convertContextToSessionContext(context: any): SessionContext {
    return {
      workingDirectory: context.cwd,
      gitBranch: context.git?.branch,
      gitStatus: context.git?.status,
      projectType: context.project?.type,
      recentCommands: context.history.commands,
      environment: process.env as Record<string, string>
    };
  }

  private startAutosave(): void {
    // Autosave every 30 seconds
    this.autosaveInterval = setInterval(async () => {
      if (this.currentSession && this.currentSession.messages.length > 0) {
        try {
          await this.saveCurrentSession();
        } catch (error) {
          console.error('Autosave failed:', error);
        }
      }
    }, 30000);
  }

  stopAutosave(): void {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = undefined;
    }
  }

  async exportSession(id: string, format: 'json' | 'markdown' = 'json'): Promise<string> {
    const session = await this.storage.loadSession(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (format === 'json') {
      return JSON.stringify(session, null, 2);
    } else {
      // Markdown format
      let markdown = `# ${session.name}\n\n`;
      markdown += `Created: ${session.created.toLocaleString()}\n`;
      markdown += `Updated: ${session.updated.toLocaleString()}\n\n`;
      markdown += `## Messages\n\n`;

      session.messages.forEach(msg => {
        markdown += `### ${msg.role.toUpperCase()} (${msg.timestamp.toLocaleTimeString()})\n\n`;
        markdown += `${msg.content}\n\n`;
        markdown += `---\n\n`;
      });

      return markdown;
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    oldestSession?: Date;
    newestSession?: Date;
  }> {
    const sessions = await this.storage.listSessions();

    let totalMessages = 0;
    let oldestSession: Date | undefined;
    let newestSession: Date | undefined;

    sessions.forEach(session => {
      if (!oldestSession || session.created < oldestSession) {
        oldestSession = session.created;
      }
      if (!newestSession || session.created > newestSession) {
        newestSession = session.created;
      }
    });

    // Load all sessions to count messages (could be optimized with DB query)
    for (const session of sessions) {
      const fullSession = await this.storage.loadSession(session.id);
      if (fullSession) {
        totalMessages += fullSession.messages.length;
      }
    }

    return {
      totalSessions: sessions.length,
      totalMessages,
      oldestSession,
      newestSession
    };
  }

  async cleanup(): Promise<void> {
    this.stopAutosave();

    if (this.currentSession && configService.get('session').autosave) {
      await this.saveCurrentSession();
    }

    await this.storage.close();
  }
}

export const sessionService = new SessionService();
