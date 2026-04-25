import { Command } from 'commander'
import { baileysService } from '@/services/baileys.service'
import { defaultStoreDir } from '@/utils/jid.utils'
import { logger } from '@/utils/logger'
import { messageService } from '@/services/message.service'
import { contactService } from '@/services/contact.service'

export const historyCommand = new Command('history')
  .description('Manage message history')

historyCommand
  .command('backfill')
  .description('Listen for and download all pending historical messages from WhatsApp')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (options) => {
    const storeDir = options.dir ?? defaultStoreDir()
    
    logger.info('Starting history backfill. This may take a while depending on the size of your WhatsApp history...')
    
    let isConnected = false
    let historyChunksReceived = 0
    let totalMessagesProcessed = 0
    let timeout: NodeJS.Timeout | null = null

    // We use a timeout approach to know when it's "done" because the history sync
    // event stream can be unpredictable in its termination.
    // If we don't receive any new history events for 30 seconds after connecting, we assume completion.
    const resetTimeout = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        logger.info({ historyChunksReceived, totalMessagesProcessed }, 'History backfill completed or no more history to sync.')
        baileysService.disconnect()
        process.exit(0)
      }, 30000)
    }

    baileysService.connect({
      storeDir,
      onConnectionUpdate: async (update) => {
        const { connection } = update
        if (connection === 'open' && !isConnected) {
          isConnected = true
          logger.info('Connected. Waiting for history sync packets...')
          
          const sock = baileysService.getSocket()
          
          // Listen to history set events
          sock.ev.on('messaging-history.set', (data) => {
            historyChunksReceived++
            logger.info({ chunkNumber: historyChunksReceived, messagesInChunk: data.messages.length }, 'Received history chunk')
            
            for (const msg of data.messages) {
              messageService.handleUpsert(msg)
              totalMessagesProcessed++
            }
            
            resetTimeout()
          })

          // Also listen to normal message upserts in case they arrive in bulk
          sock.ev.on('messages.upsert', (data) => {
            for (const msg of data.messages) {
              messageService.handleUpsert(msg)
              totalMessagesProcessed++
            }
            resetTimeout()
          })

          // Bind to contacts and chats
          sock.ev.on('contacts.upsert', (contacts) => {
            contactService.handleContactUpsert(contacts)
            resetTimeout()
          })
          
          sock.ev.on('contacts.update', (contacts) => {
            contactService.handleContactUpdate(contacts)
            resetTimeout()
          })

          sock.ev.on('chats.upsert', (chats) => {
            contactService.handleChatUpsert(chats)
            resetTimeout()
          })

          sock.ev.on('chats.update', (chats) => {
            contactService.handleChatUpdate(chats)
            resetTimeout()
          })

          resetTimeout() // Start the initial timeout
        }
      }
    }).catch((err) => {
      logger.error({ err }, 'Failed to connect for history backfill')
      process.exit(1)
    })
  })
