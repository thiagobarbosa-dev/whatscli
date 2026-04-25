/**
 * Output formatter — respects --json flag and TTY detection.
 *
 * Rules:
 *  - In a TTY without --json: pretty-print with chalk for human readability
 *  - With --json or piped (non-TTY): one JSON object per line (NDJSON)
 */

import chalk from 'chalk'

export interface GlobalOptions {
  json?: boolean
  full?: boolean
}

export interface OpenClawOutput {
  id: string
  chat: string
  chat_name: string
  sender: string
  sender_name: string
  from_me: boolean
  timestamp: number
  type: string
  content: string | null
  quoted_id: string | null
  media_path: string | null
}

export function enforceSchema(data: any): OpenClawOutput | any {
  if (data && typeof data.id === 'string' && typeof data.chat_jid === 'string') {
    return {
      id: data.id,
      chat: data.chat_jid,
      chat_name: data.chat_name ?? '',
      sender: data.sender_jid,
      sender_name: data.sender_name ?? '',
      from_me: Boolean(data.from_me),
      timestamp: data.timestamp,
      type: data.type,
      content: data.content ?? null,
      quoted_id: data.quoted_id ?? null,
      media_path: data.media_path ?? null
    }
  }
  return data
}

/** Print a single data record according to output mode. */
export function outputRecord(data: Record<string, unknown>, opts: GlobalOptions): void {
  if (isJsonMode(opts)) {
    process.stdout.write(JSON.stringify(enforceSchema(data)) + '\n')
  } else {
    printHuman(data, opts)
  }
}

/** Print a list of records according to output mode. */
export function outputList(items: Record<string, unknown>[], opts: GlobalOptions): void {
  if (isJsonMode(opts)) {
    for (const item of items) {
      process.stdout.write(JSON.stringify(enforceSchema(item)) + '\n')
    }
  } else {
    if (items.length === 0) {
      console.log(chalk.dim('No results.'))
      return
    }
    for (const item of items) {
      printHuman(item, opts)
    }
  }
}

/** Print a success message (always to stdout, never in JSON output). */
export function outputSuccess(message: string, opts: GlobalOptions): void {
  if (!isJsonMode(opts)) {
    console.log(chalk.green('✅ ' + message))
  }
}

/** Print an error message to stderr. */
export function outputError(message: string, opts: GlobalOptions): void {
  if (isJsonMode(opts)) {
    process.stderr.write(JSON.stringify({ error: message }) + '\n')
  } else {
    console.error(chalk.red('❌ ' + message))
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isJsonMode(opts: GlobalOptions): boolean {
  return opts.json === true || !process.stdout.isTTY
}

function printHuman(data: Record<string, unknown>, opts: GlobalOptions): void {
  const maxLen = opts.full ? Infinity : 80
  for (const [key, value] of Object.entries(data)) {
    const val = String(value ?? '')
    const display = val.length > maxLen ? val.slice(0, maxLen) + '…' : val
    console.log(`  ${chalk.dim(key + ':')} ${display}`)
  }
  console.log()
}
