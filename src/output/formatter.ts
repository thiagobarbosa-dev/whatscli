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

/** Print a single data record according to output mode. */
export function outputRecord(data: Record<string, unknown>, opts: GlobalOptions): void {
  if (isJsonMode(opts)) {
    process.stdout.write(JSON.stringify(data) + '\n')
  } else {
    printHuman(data, opts)
  }
}

/** Print a list of records according to output mode. */
export function outputList(items: Record<string, unknown>[], opts: GlobalOptions): void {
  if (isJsonMode(opts)) {
    for (const item of items) {
      process.stdout.write(JSON.stringify(item) + '\n')
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
