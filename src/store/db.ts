/**
 * SQLite database layer using node-sqlite3-wasm.
 *
 * node-sqlite3-wasm is a pure WebAssembly SQLite binding — no native compilation
 * required. This makes it compatible with any Node.js version, including v25+.
 *
 * API is intentionally similar to better-sqlite3 for easy future migration.
 */

import { Database } from 'node-sqlite3-wasm'
import path from 'path'
import fs from 'fs'
import { logger } from '@/utils/logger'

let _db: InstanceType<typeof Database> | null = null

/** Returns the singleton SQLite database, initializing it on first call. */
export function getDb(storeDir: string): InstanceType<typeof Database> {
  if (_db) return _db

  // Ensure the store directory exists
  fs.mkdirSync(storeDir, { recursive: true })

  const dbPath = path.join(storeDir, 'whatscli.db')
  _db = new Database(dbPath)

  // Performance and safety pragmas
  _db.run('PRAGMA journal_mode = WAL')
  _db.run('PRAGMA foreign_keys = ON')
  _db.run('PRAGMA synchronous = NORMAL')

  runMigrations(_db)

  logger.debug({ dbPath }, 'SQLite database initialized')
  return _db
}

/** Close the database connection (call on process exit). */
export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}

// ─── Migration runner ────────────────────────────────────────────────────────

interface Migration {
  version: number
  sql: string
}

function runMigrations(db: InstanceType<typeof Database>): void {
  // Bootstrap migration tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      applied_at  INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  const rows = db.all('SELECT version FROM schema_migrations ORDER BY version') as Array<{
    version: number
  }>
  const applied = rows.map((r) => r.version)

  for (const migration of migrations) {
    if (!applied.includes(migration.version)) {
      logger.debug({ version: migration.version }, 'Applying database migration')
      db.run(migration.sql)
      db.run('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version])
    }
  }
}

// ─── Migration definitions ───────────────────────────────────────────────────

const migrations: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS contacts (
        jid         TEXT PRIMARY KEY,
        name        TEXT,
        short_name  TEXT,
        alias       TEXT,
        tags        TEXT,
        updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS chats (
        jid              TEXT PRIMARY KEY,
        name             TEXT,
        unread_count     INTEGER NOT NULL DEFAULT 0,
        last_message_at  INTEGER,
        is_group         INTEGER NOT NULL DEFAULT 0,
        updated_at       INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `,
  },
]
