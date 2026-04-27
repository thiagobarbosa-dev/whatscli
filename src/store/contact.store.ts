import { getDb } from './db.js'
import { defaultStoreDir } from '../utils/jid.utils.js'

export interface ContactRecord {
  jid: string
  name: string | null
  short_name: string | null
  pushname: string | null
  lid: string | null
  pn_jid: string | null
  updated_at: number
}

export class ContactStore {
  upsert(record: Omit<ContactRecord, 'updated_at'>): void {
    const db = getDb(defaultStoreDir())
    
    // SQLite upsert
    db.run(
      `
      INSERT INTO contacts (jid, name, short_name, pushname, lid, pn_jid)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(jid) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        short_name = COALESCE(excluded.short_name, short_name),
        pushname = COALESCE(excluded.pushname, pushname),
        lid = COALESCE(excluded.lid, lid),
        pn_jid = COALESCE(excluded.pn_jid, pn_jid),
        updated_at = unixepoch()
      `,
      [record.jid, record.name, record.short_name, record.pushname, record.lid || null, record.pn_jid || null]
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
       WHERE name LIKE ? OR short_name LIKE ? OR pushname LIKE ? OR jid LIKE ? OR lid LIKE ? OR pn_jid LIKE ?
       ORDER BY updated_at DESC`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    ) as unknown as ContactRecord[]
  }
}

export const contactStore = new ContactStore()
