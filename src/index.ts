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
  .option('--read-only', 'Block all operations that write to WhatsApp or the local store')

// ── Register commands ─────────────────────────────────────────────────────────
program.addCommand(authCommand)
program.addCommand(doctorCommand)
program.addCommand(syncCommand)
program.addCommand(messagesCommand)

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('exit', () => closeDb())
process.on('SIGTERM', () => process.exit(0))

// ── Parse ─────────────────────────────────────────────────────────────────────
program.parseAsync(process.argv).catch((err: Error) => {
  process.stderr.write(`Error: ${err.message}\n`)
  process.exit(1)
})
