import { Command } from 'commander'
import { baileysService } from '../services/baileys.service.js'
import { defaultStoreDir } from '../utils/jid.utils.js'
import { logger } from '../utils/logger.js'
import { mediaService } from '../services/media.service.js'
import { getDb } from '../store/db.js'
import path from 'path'
import fs from 'fs'

export const mediaCommand = new Command('media')
  .description('Download media from received messages')

mediaCommand
  .command('download')
  .description('Download media attached to a specific message ID')
  .requiredOption('--message-id <msg_id>', 'ID of the message containing the media')
  .option('--dir <path>', 'Destination directory (defaults to current directory)')
  .option('--store-dir <path>', 'Custom directory for auth state and db')
  .action(async (options) => {
    const storeDir = options.storeDir ?? defaultStoreDir()
    const outputDir = options.dir ? path.resolve(options.dir) : process.cwd()
    
    const db = getDb(storeDir)
    
    try {
      // 1. Get the raw_json of the message from the DB
      const row = db.get('SELECT raw_json FROM messages WHERE id = ?', [options.messageId]) as any
      if (!row || !row.raw_json) {
        logger.error({ msgId: options.messageId }, 'Message not found in database or has no raw_json')
        process.exit(1)
      }

      const waMessage = JSON.parse(row.raw_json)

      // 2. We need the Baileys socket to download media (it handles decryption/fetching)
      let executed = false
      baileysService.connect({
        storeDir,
        onConnectionUpdate: async (update) => {
          const { connection } = update
          if (connection === 'open' && !executed) {
            executed = true
            try {
              logger.info({ msgId: options.messageId }, 'Connected, starting download...')
              
              const savedPath = await mediaService.downloadMedia(waMessage, outputDir)
              
              // 3. Update the database to reflect the local media path
              db.run('UPDATE messages SET media_path = ? WHERE id = ?', [savedPath, options.messageId])
              
              logger.info({ savedPath }, 'Media downloaded and database updated')
              
              setTimeout(() => {
                baileysService.disconnect()
                process.exit(0)
              }, 1000)
            } catch (err) {
              logger.error({ err }, 'Media download failed')
              process.exit(1)
            }
          }
        }
      })
    } catch (err) {
      logger.error({ err }, 'Failed to execute media download')
      process.exit(1)
    }
  })
