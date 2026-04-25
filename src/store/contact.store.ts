import { getDb } from './db.js'
import { defaultStoreDir } from '../utils/jid.utils.js'

export interface ContactRecord {
  jid: string
  name: string | null
  short_name: string | null
  pushname: string | null
  updated_at: number
}

export class ContactStore {
  upsert(record: Omit<ContactRecord, 'updated_at'>): void {
    const db = getDb(defaultStoreDir())
    
    // SQLite upsert
    db.run(
      `
      INSERT INTO contacts (jid, name, short_name, pushname)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(jid) DO UPDATE SET
        name = excluded.name,
        short_name = excluded.short_name,
        pushname = excluded.pushname,
        updated_at = unixepoch()
      `,
      [record.jid, record.name, record.short_name, record.pushname]
    )
  }

  get(jid: string): ContactRecord | undefined {
    const db = getDb(defaultStoreDir())
    return db.get('SELECT * FROM contacts WHERE jid = ?', [jid]) as unknown as ContactRecord | undefined
  }

  search(query: string): ContactRecord[] {
    const db = getDb(defaultStoreDir())
    return db.all(
      `SELECT * FROM contacts 
       WHERE name LIKE ? OR short_name LIKE ? OR pushname LIKE ? OR jid LIKE ?
       ORDER BY updated_at DESC`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    ) as unknown as ContactRecord[]
  }
}

export const contactStore = new ContactStore()
