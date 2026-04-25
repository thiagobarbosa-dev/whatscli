import { getDb } from './db.js'
import { defaultStoreDir } from '../utils/jid.utils.js'

export interface ChatRecord {
  jid: string
  name: string | null
  unread_count: number
  last_message_at: number | null
  is_group: number
  updated_at: number
}

export class ChatStore {
  upsert(record: Omit<ChatRecord, 'updated_at' | 'is_group'> & { is_group?: number }): void {
    const db = getDb(defaultStoreDir())
    
    // Convert boolean-like is_group to integer
    const isGroupInt = record.is_group ? 1 : (record.jid.endsWith('@g.us') ? 1 : 0)

    db.run(
      `
      INSERT INTO chats (jid, name, unread_count, last_message_at, is_group)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(jid) DO UPDATE SET
        name = COALESCE(excluded.name, chats.name),
        unread_count = COALESCE(excluded.unread_count, chats.unread_count),
        last_message_at = COALESCE(excluded.last_message_at, chats.last_message_at),
        is_group = excluded.is_group,
        updated_at = unixepoch()
      `,
      [record.jid, record.name, record.unread_count, record.last_message_at, isGroupInt]
    )
  }

  get(jid: string): ChatRecord | undefined {
    const db = getDb(defaultStoreDir())
    return db.get('SELECT * FROM chats WHERE jid = ?', [jid]) as unknown as ChatRecord | undefined
  }

  list(options: { limit?: number; offset?: number } = {}): ChatRecord[] {
    const db = getDb(defaultStoreDir())
    const limit = options.limit || 50
    const offset = options.offset || 0

    return db.all(
      `SELECT * FROM chats ORDER BY last_message_at DESC NULLS LAST LIMIT ? OFFSET ?`,
      [limit, offset]
    ) as unknown as ChatRecord[]
  }
}

export const chatStore = new ChatStore()
