#!/usr/bin/env node

// Fix EPIPE errors (Broken Pipe) when piping output (e.g., to 'head')
process.stdout.on('error', (err: any) => {
  if (err.code === 'EPIPE') process.exit(0)
})
process.stderr.on('error', (err: any) => {
  if (err.code === 'EPIPE') process.exit(0)
})

/**
 * WhatsCLI entrypoint
 *
 * Global flags are defined here and inherited by all subcommands.
 * Each command file exports a Commander Command instance which is
 * registered here via program.addCommand().
 */

import { Command } from 'commander'
import path from 'path'
import os from 'os'
import { createRequire } from 'module'
import { closeDb } from './store/db.js'
import { authCommand } from './commands/auth.js'
import { doctorCommand } from './commands/doctor.js'
import { syncCommand } from './commands/sync.js'
import { messagesCommand } from './commands/messages.js'
import { sendCommand } from './commands/send.js'
import { sendBulkCommand } from './commands/send-bulk.js'
import { mediaCommand } from './commands/media.js'
import { historyCommand } from './commands/history.js'
import { presenceCommand } from './commands/presence.js'
import { contactsCommand } from './commands/contacts.js'
import { chatsCommand } from './commands/chats.js'
import { groupsCommand } from './commands/groups.js'
import { versionCommand } from './commands/version.js'

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string; description: string }

const DEFAULT_STORE_DIR = path.join(os.homedir(), '.whatscli')

const program = new Command()
  .name('whatscli')
  .description('WhatsApp Web CLI powered by Baileys')
  .version(pkg.version, '-V, --version', 'Print version and exit')
  // ── Global flags (Rule 15) ─────────────────────────────────────────────────
  .option(
    '--store <dir>',
    'Data store directory (or set WHATSCLI_STORE_DIR)',
    process.env['WHATSCLI_STORE_DIR'] ?? DEFAULT_STORE_DIR
  )
  .option('--json', 'Output as JSON — one object per line (NDJSON)')
  .option('--full', 'Disable truncation in table output')
  .option('--timeout <duration>', 'Timeout for non-sync commands (e.g. 30s)', '30s')
  .option('--read-only', 'Block all operations that write to WhatsApp or modify external state')

// ── Read-Only Enforcement ─────────────────────────────────────────────────────
program.hook('preAction', (thisCommand, actionCommand) => {
  const opts = thisCommand.opts()
  if (opts.readOnly) {
    const cmdName = actionCommand.name()
    const parentName = actionCommand.parent?.name()
    
    // Commands that mutate WhatsApp state
    const blockedParents = ['send', 'send-bulk', 'presence']
    const blockedCommands = ['rename', 'leave', 'participants', 'backfill']
    
    if (blockedParents.includes(parentName || '') || blockedCommands.includes(cmdName)) {
      process.stderr.write(`Error: Command '${parentName ? parentName + ' ' : ''}${cmdName}' is blocked by --read-only mode.\n`)
      process.exit(1)
    }
  }
})

// ── Register commands ─────────────────────────────────────────────────────────
program.addCommand(authCommand)
program.addCommand(doctorCommand)
program.addCommand(syncCommand)
program.addCommand(messagesCommand)
program.addCommand(sendCommand)
program.addCommand(sendBulkCommand)
program.addCommand(mediaCommand)
program.addCommand(historyCommand)
program.addCommand(presenceCommand)
program.addCommand(contactsCommand)
program.addCommand(chatsCommand)
program.addCommand(groupsCommand)
program.addCommand(versionCommand)

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('exit', () => closeDb())
process.on('SIGTERM', () => process.exit(0))

// ── Parse ─────────────────────────────────────────────────────────────────────
program.parseAsync(process.argv).catch((err: Error) => {
  process.stderr.write(`Error: ${err.message}\n`)
  process.exit(1)
})
