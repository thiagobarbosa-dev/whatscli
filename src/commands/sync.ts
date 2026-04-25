import { Command } from 'commander'
import chalk from 'chalk'
import { baileysService } from '@/services/baileys.service'
import { messageService } from '@/services/message.service'
import { outputSuccess, outputError } from '@/output/formatter'
import { logger } from '@/utils/logger'
import { defaultStoreDir } from '@/utils/jid.utils'

export const syncCommand = new Command('sync')
  .description('Sync messages and data locally')
  .option('--once', 'Sync once and exit automatically after 10s of inactivity')
  .option('--follow', 'Keep syncing indefinitely (daemon mode)')
  .action(async (opts: { once?: boolean; follow?: boolean }, cmd: Command) => {
    const globalOpts = cmd.parent?.opts() ?? {}
    const storeDir: string = globalOpts['store'] ?? defaultStoreDir()

    if (!opts.once && !opts.follow) {
      // Default to --once if nothing is specified, or you can require one. Let's assume once
      opts.once = true
    }

    let isJson = globalOpts['json'] === true
    let syncedCount = 0
    let timeout: NodeJS.Timeout | null = null

    const resetTimeout = () => {
      if (!opts.once) return
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (!isJson) {
          console.log(chalk.dim('\nSync complete. Exiting.\n'))
        }
        baileysService.disconnect()
        process.exit(0)
      }, 10_000)
    }

    try {
      const socket = await baileysService.connect({
        storeDir,
        onConnectionUpdate(update) {
          if (update.connection === 'open') {
            outputSuccess('Connected. Syncing messages...', globalOpts)
            resetTimeout()
          }
        },
      })

      // Bind to message upserts
      socket.ev.on('messages.upsert', async (payload) => {
        if (!isJson) {
          process.stdout.write(chalk.dim('.')) // Print dot for each batch
        }
        
        for (const msg of payload.messages) {
          await messageService.handleUpsert(msg)
          syncedCount++
        }
        resetTimeout()
      })

    } catch (err) {
      logger.error(err, 'Sync error')
      outputError('Failed to start sync', globalOpts)
      process.exit(1)
    }
  })
