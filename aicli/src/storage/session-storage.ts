import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import { Session, Message, StorageProvider } from "../types";
import { securityService } from "../services/security.service";

export class SessionStorage implements StorageProvider {
  private db?: Database.Database;
  private dbPath: string;

  constructor(storagePath: string) {
    this.dbPath = path.join(storagePath, "sessions.db");
  }

  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath);
    this.db.pragma("foreign_keys = ON");

    // Create tables
    await this.createTables();
  }

  private runAsync(sql: string, params: any[] = []): Promise<void> {
    this.db!.prepare(sql).run(...params);
    return Promise.resolve();
  }

  private getAsync(sql: string, params: any[] = []): Promise<any> {
    const row = this.db!.prepare(sql).get(...params);
    return Promise.resolve(row);
  }

  private allAsync(sql: string, params: any[] = []): Promise<any[]> {
    const rows = this.db!.prepare(sql).all(...params);
    return Promise.resolve(rows || []);
  }

  private async createTables(): Promise<void> {
    if (!this.db) {throw new Error("Database not initialized");}

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
    if (!this.db) {throw new Error("Database not initialized");}

    // Encrypt sensitive data
    const encryptedContext = await securityService.encrypt(JSON.stringify(session.context));
    const encryptedMetadata = session.metadata ? await securityService.encrypt(JSON.stringify(session.metadata)) : null;

    // Save session
    await this.runAsync(
      `INSERT OR REPLACE INTO sessions (id, name, created, updated, context, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.name,
        session.created.getTime(),
        session.updated.getTime(),
        encryptedContext,
        encryptedMetadata,
      ],
    );

    // Delete existing messages for this session
    await this.runAsync(`DELETE FROM messages WHERE session_id = ?`, [
      session.id,
    ]);

    // Save messages
    for (const message of session.messages) {
      const encryptedContent = await securityService.encrypt(message.content);
      const encryptedMessageMetadata = message.metadata ? await securityService.encrypt(JSON.stringify(message.metadata)) : null;

      await this.runAsync(
        `INSERT INTO messages (id, session_id, role, content, timestamp, tokens, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          session.id,
          message.role,
          encryptedContent,
          message.timestamp.getTime(),
          message.tokens || null,
          encryptedMessageMetadata,
        ],
      );
    }

    // Update FTS index - DISABLED FOR SECURITY (Plain text leakage)
    /*
    await this.runAsync(
      `INSERT OR REPLACE INTO sessions_fts (rowid, name, content)
       VALUES (
         (SELECT rowid FROM sessions WHERE id = ?),
         ?,
         ?
       )`,
      [
        session.id,
        session.name,
        session.messages.map((m) => m.content).join(" "),
      ],
    );
    */
  }

  async loadSession(id: string): Promise<Session | null> {
    if (!this.db) {throw new Error("Database not initialized");}

    // Load session
    const sessionRow: any = await this.getAsync(
      `SELECT * FROM sessions WHERE id = ?`,
      [id],
    );

    if (!sessionRow) {return null;}

    // Decrypt session data
    let context, metadata;
    try {
      context = JSON.parse(await securityService.decrypt(sessionRow.context));
    } catch {
      // Fallback for legacy plain text
      try { context = JSON.parse(sessionRow.context); } catch { context = {}; }
    }

    if (sessionRow.metadata) {
      try {
        metadata = JSON.parse(await securityService.decrypt(sessionRow.metadata));
      } catch {
        try { metadata = JSON.parse(sessionRow.metadata); } catch { metadata = undefined; }
      }
    }

    // Load messages
    const messageRows: any[] = await this.allAsync(
      `SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC`,
      [id],
    );

    const messages: Message[] = [];
    for (const row of messageRows) {
      let content = row.content;
      try {
        content = await securityService.decrypt(row.content);
      } catch {
        // Fallback for legacy
      }

      let msgMetadata = undefined;
      if (row.metadata) {
        try {
          msgMetadata = JSON.parse(await securityService.decrypt(row.metadata));
        } catch {
          try { msgMetadata = JSON.parse(row.metadata); } catch { }
        }
      }

      messages.push({
        id: row.id,
        role: row.role,
        content,
        timestamp: new Date(row.timestamp),
        tokens: row.tokens || undefined,
        metadata: msgMetadata,
      });
    }

    return {
      id: sessionRow.id,
      name: sessionRow.name,
      created: new Date(sessionRow.created),
      updated: new Date(sessionRow.updated),
      messages,
      context,
      metadata,
    };
  }

  async listSessions(): Promise<Session[]> {
    if (!this.db) {throw new Error("Database not initialized");}

    const rows: any[] = await this.allAsync(
      `SELECT id, name, created, updated, context, metadata
       FROM sessions
       ORDER BY updated DESC`,
    );

    const sessions: Session[] = [];
    for (const row of rows) {
      let context: any = {};
      try {
        context = JSON.parse(await securityService.decrypt(row.context));
      } catch {
        try { context = JSON.parse(row.context); } catch { }
      }

      let metadata = undefined;
      if (row.metadata) {
        try {
          metadata = JSON.parse(await securityService.decrypt(row.metadata));
        } catch {
          try { metadata = JSON.parse(row.metadata); } catch { }
        }
      }

      sessions.push({
        id: row.id,
        name: row.name,
        created: new Date(row.created),
        updated: new Date(row.updated),
        messages: [], // Don't load messages for list view
        context,
        metadata,
      });
    }

    return sessions;
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.db) {throw new Error("Database not initialized");}

    await this.runAsync(`DELETE FROM messages WHERE session_id = ?`, [id]);
    await this.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);
    await this.runAsync(
      `DELETE FROM sessions_fts WHERE rowid = (
        SELECT rowid FROM sessions WHERE id = ?
      )`,
      [id],
    );
  }

  async searchSessions(query: string): Promise<Session[]> {
    // Search is effectively disabled for encrypted content unless we implement secure search index
    // For now, it will return empty or only match unencrypted legacy data
    if (!this.db) {throw new Error("Database not initialized");}

    const rows: any[] = await this.allAsync(
      `SELECT s.id, s.name, s.created, s.updated, s.context, s.metadata
       FROM sessions s
       JOIN sessions_fts fts ON s.rowid = fts.rowid
       WHERE sessions_fts MATCH ?
       ORDER BY rank`,
      [query],
    );

    // We still need to decrypt results if any found
    const sessions: Session[] = [];
    for (const row of rows) {
      let context: any = {};
      try {
        context = JSON.parse(await securityService.decrypt(row.context));
      } catch {
        try { context = JSON.parse(row.context); } catch { }
      }
      sessions.push({
        id: row.id,
        name: row.name,
        created: new Date(row.created),
        updated: new Date(row.updated),
        messages: [],
        context,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      });
    }
    return sessions;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }
}
