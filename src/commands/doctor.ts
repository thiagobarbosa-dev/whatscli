import { Command } from 'commander'
import fs from 'fs'
import chalk from 'chalk'
import { hasAuthState } from '@/auth/state'
import { getDb } from '@/store/db'
import { logger } from '@/utils/logger'
import { defaultStoreDir } from '@/utils/jid.utils'

interface CheckResult {
  name: string
  ok: boolean
  detail?: string
}

export const doctorCommand = new Command('doctor')
  .description('Check environment health and configuration')
  .option('--connect', 'Test live WhatsApp connection (requires prior auth)')
  .action(async (opts: { connect?: boolean }, cmd: Command) => {
    const globalOpts = cmd.parent?.opts() ?? {}
    const storeDir: string = globalOpts['store'] ?? defaultStoreDir()

    const checks: CheckResult[] = []

    // ── 1. Store directory ─────────────────────────────────────────────────
    const storeExists = fs.existsSync(storeDir)
    checks.push({
      name: 'store_directory',
      ok: storeExists,
      detail: storeExists ? storeDir : `Not found — will be created on first run`,
    })

    // ── 2. Auth state ──────────────────────────────────────────────────────
    const authenticated = hasAuthState(storeDir)
    checks.push({
      name: 'auth_state',
      ok: authenticated,
      detail: authenticated ? 'credentials.json found' : 'Run "whatscli auth" to authenticate',
    })

    // ── 3. SQLite store ────────────────────────────────────────────────────
    let dbOk = false
    let dbDetail: string | undefined
    try {
      getDb(storeDir)
      dbOk = true
      dbDetail = 'WAL mode, migrations applied'
    } catch (err) {
      logger.debug(err, 'SQLite check failed')
      dbDetail = err instanceof Error ? err.message : 'Unknown error'
    }
    checks.push({ name: 'sqlite_store', ok: dbOk, detail: dbDetail })

    // ── 4. Live connection (optional --connect) ────────────────────────────
    // ── 4. Live connection (optional --connect) ────────────────────────────
    if (opts.connect) {
      if (!authenticated) {
        checks.push({ name: 'live_connection', ok: false, detail: 'Skipped (no auth state)' })
      } else {
        try {
          const { baileysService } = require('@/services/baileys.service')
          await new Promise<void>((resolve, reject) => {
            let connected = false
            baileysService.connect({
              storeDir,
              onConnectionUpdate(update: any) {
                if (update.connection === 'open' && !connected) {
                  connected = true
                  setTimeout(() => {
                    baileysService.disconnect()
                    resolve()
                  }, 1000)
                } else if (update.connection === 'close' && !connected) {
                  const code = update.lastDisconnect?.error?.output?.statusCode
                  reject(new Error(`Connection closed (code: ${code})`))
                }
              }
            }).catch(reject)
            
            setTimeout(() => {
              if (!connected) {
                baileysService.disconnect()
                reject(new Error('Timeout connecting to WhatsApp'))
              }
            }, 15000)
          })
          checks.push({ name: 'live_connection', ok: true, detail: 'Successfully connected to WhatsApp server' })
        } catch (err) {
          checks.push({ name: 'live_connection', ok: false, detail: err instanceof Error ? err.message : String(err) })
        }
      }
    }

    // ── Output ─────────────────────────────────────────────────────────────
    if (globalOpts['json']) {
      process.stdout.write(
        JSON.stringify({
          checks: checks.map(({ name, ok, detail }) => ({ name, ok, detail })),
          storeDir,
          allOk: checks.every((c) => c.ok),
        }) + '\n'
      )
    } else {
      console.log(chalk.bold('\nWhatsCLI Doctor\n'))
      for (const c of checks) {
        const icon = c.ok ? chalk.green('✅') : chalk.red('❌')
        const name = chalk.dim(c.name.padEnd(20))
        const detail = c.detail ? chalk.gray(` (${c.detail})`) : ''
        console.log(`  ${icon}  ${name}${detail}`)
      }
      console.log()
    }

    const allOk = checks.every((c) => c.ok)
    process.exit(allOk ? 0 : 1)
  })
