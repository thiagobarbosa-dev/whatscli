import { Command } from 'commander'
import path from 'path'
import os from 'os'
import { getDb } from '@/store/db'
import { messageStore } from '@/store/message.store'
import { outputList, outputRecord, outputError } from '@/output/formatter'
import { normalizeJid, defaultStoreDir } from '@/utils/jid.utils'

export const messagesCommand = new Command('messages')
  .description('Manage and search synced messages')

messagesCommand
  .command('list')
  .description('List recent messages')
  .option('--chat <jid>', 'Filter by chat JID or phone number')
  .option('--limit <n>', 'Number of messages to return', '50')
  .action((opts: { chat?: string; limit: string }, cmd: Command) => {
    const globalOpts = cmd.parent?.parent?.opts() ?? {}

    try {
      const limit = parseInt(opts.limit, 10)
      const chat_jid = opts.chat ? normalizeJid(opts.chat) : undefined

      const results = messageStore.list({ chat_jid, limit })
      
      outputList(results as any, globalOpts)
    } catch (err) {
      outputError(err instanceof Error ? err.message : 'Unknown error', globalOpts)
      process.exit(1)
    }
  })

messagesCommand
  .command('search <query>')
  .description('Search local messages via Full-Text Search (FTS5)')
  .option('--chat <jid>', 'Filter by chat JID or phone number')
  .option('--limit <n>', 'Number of messages to return', '50')
  .action((query: string, opts: { chat?: string; limit: string }, cmd: Command) => {
    const globalOpts = cmd.parent?.parent?.opts() ?? {}

    try {
      const limit = parseInt(opts.limit, 10)
      const chat_jid = opts.chat ? normalizeJid(opts.chat) : undefined

      // Prepare FTS syntax: add * for prefix matching on the last word if it's simple
      const cleanQuery = query.replace(/[^a-zA-Z0-9\s]/g, '')
      const ftsQuery = `"${cleanQuery}"*` // simple prefix match

      const results = messageStore.search(ftsQuery, { chat_jid, limit })
      
      outputList(results as any, globalOpts)
    } catch (err) {
      outputError(err instanceof Error ? err.message : 'Unknown error', globalOpts)
      process.exit(1)
    }
  })

messagesCommand
  .command('show <id>')
  .description('Show a specific message by ID')
  .action((id: string, opts: any, cmd: Command) => {
    const globalOpts = cmd.parent?.parent?.opts() ?? {}
    try {
      const storeDir = globalOpts['store'] ?? defaultStoreDir()
      const db = getDb(storeDir)
      const msg = db.prepare(`
        SELECT m.*, 
               COALESCE(c.name, '') as chat_name,
               COALESCE(u.name, u.short_name, u.alias, '') as sender_name
        FROM messages m
        LEFT JOIN chats c ON m.chat_jid = c.jid
        LEFT JOIN contacts u ON m.sender_jid = u.jid
        WHERE m.id = ?
      `).get(id)
      
      if (!msg) {
        outputError(`Message ${id} not found`, globalOpts)
        process.exit(1)
      }
      
      const row = msg as any
      row.from_me = row.from_me === 1
      outputRecord(row, globalOpts)
    } catch (err) {
      outputError(err instanceof Error ? err.message : 'Unknown error', globalOpts)
      process.exit(1)
    }
  })

messagesCommand
  .command('context <id>')
  .description('Show context around a message by ID')
  .option('--limit <n>', 'Number of messages before and after', '5')
  .action((id: string, opts: { limit: string }, cmd: Command) => {
    const globalOpts = cmd.parent?.parent?.opts() ?? {}
    try {
      const storeDir = globalOpts['store'] ?? defaultStoreDir()
      const db = getDb(storeDir)
      const msg = db.prepare('SELECT chat_jid, timestamp FROM messages WHERE id = ?').get(id)
      
      if (!msg) {
        outputError(`Message ${id} not found`, globalOpts)
        process.exit(1)
      }

      const limit = parseInt(opts.limit, 10)
      
      const msgRow = msg as any
      const rows = db.prepare(`
        SELECT m.*,
               COALESCE(c.name, '') as chat_name,
               COALESCE(u.name, u.short_name, u.alias, '') as sender_name
        FROM messages m
        LEFT JOIN chats c ON m.chat_jid = c.jid
        LEFT JOIN contacts u ON m.sender_jid = u.jid
        WHERE m.chat_jid = ?
        AND m.timestamp BETWEEN ? AND ?
        ORDER BY m.timestamp ASC
      `).all([msgRow.chat_jid, (msgRow.timestamp as number) - 3600 * 24, (msgRow.timestamp as number) + 3600 * 24]) as any[]

      const idx = rows.findIndex((r) => r.id === id)
      const start = Math.max(0, idx - limit)
      const end = Math.min(rows.length, idx + limit + 1)
      
      const results = rows.slice(start, end).map(r => ({...r, from_me: r.from_me === 1}))
      
      outputList(results as any, globalOpts)
    } catch (err) {
      outputError(err instanceof Error ? err.message : 'Unknown error', globalOpts)
      process.exit(1)
    }
  })
