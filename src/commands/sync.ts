import { Command } from 'commander'
import chalk from 'chalk'
import { baileysService } from '../services/baileys.service.js'
import { messageService } from '../services/message.service.js'
import { contactService } from '../services/contact.service.js'
import { chatStore } from '../store/chat.store.js'
import { groupService } from '../services/group.service.js'
import { outputSuccess, outputError } from '../output/formatter.js'
import { logger } from '../utils/logger.js'
import { defaultStoreDir } from '../utils/jid.utils.js'

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
            
            // Self-healing: Fetch metadata for groups that have no name in the database
            const namelessGroups = chatStore.list({ limit: 500 }).filter(c => c.is_group && !c.name)
            if (namelessGroups.length > 0) {
              logger.debug({ count: namelessGroups.length }, 'Found nameless groups, fetching metadata sequentially...')
              
              // Run in background but sequentially
              ;(async () => {
                for (const group of namelessGroups) {
                  try {
                    logger.debug({ jid: group.jid }, 'Fetching group metadata...')
                    await groupService.getGroupMetadata(storeDir, group.jid)
                    resetTimeout() // Reset timeout to keep sync alive while fetching
                    // Small delay to be polite
                    await new Promise(r => setTimeout(r, 1000))
                  } catch (err) {
                    logger.debug({ jid: group.jid, err }, 'Failed to auto-fetch group metadata')
                  }
                }
              })()
            }
            
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

      // Bind to contacts and chats
      socket.ev.on('contacts.upsert', (contacts) => {
        contactService.handleContactUpsert(contacts)
        resetTimeout()
      })
      
      socket.ev.on('contacts.update', (contacts) => {
        contactService.handleContactUpdate(contacts)
        resetTimeout()
      })

      socket.ev.on('chats.upsert', async (chats) => {
        contactService.handleChatUpsert(chats)
        
        // Auto-fetch metadata for groups without names
        for (const chat of chats) {
          if (chat.id && chat.id.endsWith('@g.us') && !chat.name) {
            logger.debug({ jid: chat.id }, 'Auto-fetching missing group metadata')
            groupService.getGroupMetadata(storeDir, chat.id).catch(() => {
              // Ignore errors during background sync
            })
          }
        }
        resetTimeout()
      })

      socket.ev.on('chats.update', async (chats) => {
        contactService.handleChatUpdate(chats)
        
        // Auto-fetch metadata for groups without names if updated
        for (const chat of chats) {
          if (chat.id && chat.id.endsWith('@g.us') && chat.name === null) {
             logger.debug({ jid: chat.id }, 'Auto-fetching missing group metadata (update)')
             groupService.getGroupMetadata(storeDir, chat.id).catch(() => {})
          }
        }
        resetTimeout()
      })

    } catch (err) {
      logger.error(err, 'Sync error')
      outputError('Failed to start sync', globalOpts)
      process.exit(1)
    }
  })
