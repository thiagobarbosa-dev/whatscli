import { Command } from 'commander'
import qrcode from 'qrcode-terminal'
import chalk from 'chalk'
import { baileysService } from '../services/baileys.service.js'
import { hasAuthState, clearAuthState } from '../auth/state.js'
import { outputSuccess, outputError } from '../output/formatter.js'
import { logger } from '../utils/logger.js'
import { defaultStoreDir } from '../utils/jid.utils.js'

// ─── Root: `whatscli auth` ───────────────────────────────────────────────────

export const authCommand = new Command('auth')
  .description('Authenticate with WhatsApp via QR code')
  .option('--follow', 'Keep running after authentication (continuous sync mode)')

// Action when called without subcommand: show QR and authenticate
authCommand.action(async (opts: { follow?: boolean }, cmd: Command) => {
  const globalOpts = cmd.parent?.opts() ?? {}
  const storeDir: string = globalOpts['store'] ?? defaultStoreDir()

  let qrShown = false

  try {
    await baileysService.connect({
      storeDir,
      onQR(qr) {
        if (!qrShown) {
          console.log(chalk.cyan('\nScan the QR code below with your WhatsApp app:\n'))
          qrShown = true
        }
        qrcode.generate(qr, { small: true })
      },
      onConnectionUpdate(update) {
        if (update.connection === 'open') {
          outputSuccess('Authenticated successfully!', globalOpts)

          if (!opts.follow) {
            // Give saveCreds ample time to flush before exiting (pairing needs a few seconds to stabilize)
            setTimeout(() => {
              baileysService.disconnect()
              process.exit(0)
            }, 5000)
          }
        }
      },
    })

    // When --follow is set, stay alive until Ctrl-C
    if (opts.follow) {
      console.log(chalk.dim('Running in follow mode. Press Ctrl-C to stop.\n'))
      process.on('SIGINT', () => {
        baileysService.disconnect()
        process.exit(0)
      })
      // Block forever
      await new Promise<never>(() => undefined)
    }
  } catch (err) {
    logger.error(err, 'Authentication error')
    outputError('Authentication failed', globalOpts)
    process.exit(1)
  }
})

// ─── Subcommand: `whatscli auth status` ─────────────────────────────────────

authCommand
  .command('status')
  .description('Check current authentication status')
  .action((_, cmd: Command) => {
    const globalOpts = cmd.parent?.parent?.opts() ?? {}
    const storeDir: string = globalOpts['store'] ?? defaultStoreDir()

    const authenticated = hasAuthState(storeDir)

    if (globalOpts['json']) {
      process.stdout.write(JSON.stringify({ authenticated, storeDir }) + '\n')
    } else {
      console.log(
        authenticated
          ? chalk.green('✅  Authenticated')
          : chalk.red('❌  Not authenticated — run "whatscli auth"')
      )
    }

    process.exit(authenticated ? 0 : 2)
  })

// ─── Subcommand: `whatscli auth logout` ──────────────────────────────────────

authCommand
  .command('logout')
  .description('Log out and clear the local session')
  .action((_, cmd: Command) => {
    const globalOpts = cmd.parent?.parent?.opts() ?? {}
    const storeDir: string = globalOpts['store'] ?? defaultStoreDir()

    clearAuthState(storeDir)
    outputSuccess('Logged out successfully', globalOpts)
    process.exit(0)
  })
