import { Command } from 'commander'
import { baileysService } from '../services/baileys.service.js'
import { defaultStoreDir, normalizeJid } from '../utils/jid.utils.js'
import { logger } from '../utils/logger.js'
import { WAPresence } from '@whiskeysockets/baileys'

export const presenceCommand = new Command('presence')
  .description('Update your presence status in a chat')

// Helper function
async function updatePresence(storeDir: string, jid: string, status: WAPresence) {
  return new Promise<void>((resolve, reject) => {
    let executed = false

    baileysService.connect({
      storeDir,
      onConnectionUpdate: async (update) => {
        const { connection } = update
        if (connection === 'open' && !executed) {
          executed = true
          try {
            logger.info({ to: jid, status }, 'Updating presence...')
            
            const sock = baileysService.getSocket()
            await sock.sendPresenceUpdate(status, jid)
            
            logger.info('Presence updated successfully')
            
            // Wait a little before closing to ensure it's sent
            setTimeout(() => {
              baileysService.disconnect()
              resolve()
            }, 1000)
          } catch (err) {
            reject(err)
          }
        }
      }
    }).catch(reject)
  })
}

presenceCommand
  .command('typing')
  .description('Set presence to typing')
  .requiredOption('--to <number>', 'Recipient phone number or JID')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (options) => {
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(options.to)
    
    try {
      await updatePresence(storeDir, jid, 'composing')
    } catch (err) {
      logger.error({ err }, 'Failed to set typing presence')
      process.exit(1)
    }
  })

presenceCommand
  .command('paused')
  .description('Stop typing/recording (paused)')
  .requiredOption('--to <number>', 'Recipient phone number or JID')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (options) => {
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(options.to)
    
    try {
      await updatePresence(storeDir, jid, 'paused')
    } catch (err) {
      logger.error({ err }, 'Failed to set paused presence')
      process.exit(1)
    }
  })

presenceCommand
  .command('recording')
  .description('Set presence to recording audio')
  .requiredOption('--to <number>', 'Recipient phone number or JID')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (options) => {
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(options.to)
    
    try {
      await updatePresence(storeDir, jid, 'recording')
    } catch (err) {
      logger.error({ err }, 'Failed to set recording presence')
      process.exit(1)
    }
  })
