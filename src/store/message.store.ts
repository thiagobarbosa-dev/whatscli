import { getDb } from '@/store/db'
import { defaultStoreDir } from '@/utils/jid.utils'
import { logger } from '@/utils/logger'

export interface MessageRecord {
  id: string
  chat_jid: string
  sender_jid: string
  from_me: boolean
  timestamp: number
  type: string
  content: string | null
  quoted_id: string | null
  media_path: string | null
  raw_json: string
}

export class MessageStore {
  private db = getDb(process.env.WHATSCLI_STORE_DIR ?? defaultStoreDir())

  /**
   * Upsert a message into the database.
   * Also updates the FTS5 virtual table for searching if content exists.
   */
  upsert(msg: MessageRecord): void {
    logger.debug({ id: msg.id, chat: msg.chat_jid }, 'Upserting message')
    
    // SQLite boolean mapping
    const from_me = msg.from_me ? 1 : 0

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, chat_jid, sender_jid, from_me, timestamp, type, content, quoted_id, media_path, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        timestamp = excluded.timestamp,
        type = excluded.type,
        quoted_id = excluded.quoted_id,
        media_path = excluded.media_path,
        raw_json = excluded.raw_json
    `)

    stmt.run([
      msg.id,
      msg.chat_jid,
      msg.sender_jid,
      from_me,
      msg.timestamp,
      msg.type,
      msg.content,
      msg.quoted_id,
      msg.media_path,
      msg.raw_json,
    ])

    // Update FTS5 virtual table if content is present
    if (msg.content) {
      const ftsStmt = this.db.prepare(`
        INSERT INTO messages_fts (message_id, content)
        VALUES (?, ?)
      `)
      // Try to insert; ignore if exists (ON CONFLICT ignored for FTS we just delete/insert to be safe)
      this.db.run('DELETE FROM messages_fts WHERE message_id = ?', [msg.id])
      ftsStmt.run([msg.id, msg.content])
    }
  }

  /** Retrieve recent messages for a chat, or across all chats */
  list(options: { chat_jid?: string; limit?: number }): MessageRecord[] {
    let sql = 'SELECT * FROM messages '
    const params: (string | number)[] = []

    if (options.chat_jid) {
      sql += 'WHERE chat_jid = ? '
      params.push(options.chat_jid)
    }

    sql += 'ORDER BY timestamp DESC LIMIT ?'
    params.push(options.limit ?? 50)

    const rows = this.db.all(sql, params) as any[]
    return rows.map(r => ({
      ...r,
      from_me: r.from_me === 1
    }))
  }

  /** Full-text search using FTS5 */
  search(query: string, options: { chat_jid?: string; limit?: number }): MessageRecord[] {
    let sql = `
      SELECT m.* 
      FROM messages_fts fts
      JOIN messages m ON m.id = fts.message_id
      WHERE messages_fts MATCH ?
    `
    const params: (string | number)[] = [query]

    if (options.chat_jid) {
      sql += ' AND m.chat_jid = ?'
      params.push(options.chat_jid)
    }

    sql += ' ORDER BY m.timestamp DESC LIMIT ?'
    params.push(options.limit ?? 50)

    const rows = this.db.all(sql, params) as any[]
    return rows.map(r => ({
      ...r,
      from_me: r.from_me === 1
    }))
  }
}

export const messageStore = new MessageStore()
