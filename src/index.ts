#!/usr/bin/env node

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
import { closeDb } from '@/store/db'
import { authCommand } from '@/commands/auth'
import { doctorCommand } from '@/commands/doctor'
import { syncCommand } from '@/commands/sync'
import { messagesCommand } from '@/commands/messages'
import { sendCommand } from '@/commands/send'
import { mediaCommand } from '@/commands/media'
import { historyCommand } from '@/commands/history'
import { presenceCommand } from '@/commands/presence'
import { contactsCommand } from '@/commands/contacts'
import { chatsCommand } from '@/commands/chats'
import { groupsCommand } from '@/commands/groups'
import { versionCommand } from '@/commands/version'

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
    const blockedParents = ['send', 'presence']
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
