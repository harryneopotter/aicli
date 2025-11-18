import sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { Session, Message, SessionContext, StorageProvider } from '../types';
import { encrypt, decrypt } from '../utils/encryption';

export class SessionStorage implements StorageProvider {
  private db?: sqlite3.Database;
  private dbPath: string;

  constructor(storagePath: string) {
    this.dbPath = path.join(storagePath, 'sessions.db');
  }

  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = await new Promise<sqlite3.Database>((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });

    // Create tables
    await this.createTables();
  }

  private runAsync(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private getAsync(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private allAsync(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL,
        context TEXT,
        metadata TEXT
      )
    `);

    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        tokens INTEGER,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_session_id
      ON messages(session_id)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp
      ON messages(timestamp)
    `);

    await this.runAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts
      USING fts5(name, content)
    `);
  }

  async saveSession(session: Session): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Save session
    await this.runAsync(
      `INSERT OR REPLACE INTO sessions (id, name, created, updated, context, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.name,
        session.created.getTime(),
        session.updated.getTime(),
        this.encryptJson(session.context),
        this.encryptJson(session.metadata)
      ]
    );

    // Delete existing messages for this session
    await this.runAsync(`DELETE FROM messages WHERE session_id = ?`, [session.id]);

    // Save messages
    for (const message of session.messages) {
      await this.runAsync(
        `INSERT INTO messages (id, session_id, role, content, timestamp, tokens, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          session.id,
          message.role,
          message.content,
          message.timestamp.getTime(),
          message.tokens || null,
          this.encryptJson(message.metadata)
        ]
      );
    }

    // Update FTS index
    await this.runAsync(
      `INSERT OR REPLACE INTO sessions_fts (rowid, name, content)
       VALUES (
         (SELECT rowid FROM sessions WHERE id = ?),
         ?,
         ?
       )`,
      [session.id, session.name, session.messages.map(m => m.content).join(' ')]
    );
  }

  async loadSession(id: string): Promise<Session | null> {
    if (!this.db) throw new Error('Database not initialized');

    // Load session
    const sessionRow: any = await this.getAsync(
      `SELECT * FROM sessions WHERE id = ?`,
      [id]
    );

    if (!sessionRow) return null;

    // Load messages
    const messageRows: any[] = await this.allAsync(
      `SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC`,
      [id]
    );

    const messages: Message[] = messageRows.map(row => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp),
      tokens: row.tokens || undefined,
      metadata: this.decryptJson(row.metadata)
    }));

    return {
      id: sessionRow.id,
      name: sessionRow.name,
      created: new Date(sessionRow.created),
      updated: new Date(sessionRow.updated),
      messages,
      context: this.decryptContext(sessionRow.context),
      metadata: this.decryptJson(sessionRow.metadata)
    };
  }

  async listSessions(): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows: any[] = await this.allAsync(
      `SELECT id, name, created, updated, context, metadata
       FROM sessions
       ORDER BY updated DESC`
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      created: new Date(row.created),
      updated: new Date(row.updated),
      messages: [], // Don't load messages for list view
      context: this.decryptContext(row.context),
      metadata: this.decryptJson(row.metadata)
    }));
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.runAsync(`DELETE FROM messages WHERE session_id = ?`, [id]);
    await this.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);
    await this.runAsync(
      `DELETE FROM sessions_fts WHERE rowid = (
        SELECT rowid FROM sessions WHERE id = ?
      )`,
      [id]
    );
  }

  async searchSessions(query: string): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows: any[] = await this.allAsync(
      `SELECT s.id, s.name, s.created, s.updated, s.context, s.metadata
       FROM sessions s
       JOIN sessions_fts fts ON s.rowid = fts.rowid
       WHERE sessions_fts MATCH ?
       ORDER BY rank`,
      [query]
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      created: new Date(row.created),
      updated: new Date(row.updated),
      messages: [],
      context: this.decryptContext(row.context),
      metadata: this.decryptJson(row.metadata)
    }));
  }

  async close(): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        this.db!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  private encryptJson(value?: Record<string, any> | SessionContext | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    return encrypt(JSON.stringify(value));
  }

  private decryptJson<T = Record<string, any>>(value?: string | null): T | undefined {
    if (!value) return undefined;
    try {
      return JSON.parse(this.safeDecrypt(value)) as T;
    } catch {
      return undefined;
    }
  }

  private decryptContext(value?: string | null): SessionContext {
    const context = value ? this.decryptJson<SessionContext>(value) : undefined;
    if (context) return context;
    return {
      workingDirectory: '',
      recentCommands: [],
      environment: {}
    };
  }

  private safeDecrypt(value: string): string {
    try {
      return decrypt(value);
    } catch {
      return value;
    }
  }
}
