import { Command } from 'commander'
import { baileysService } from '../services/baileys.service.js'
import { defaultStoreDir, normalizeJid } from '../utils/jid.utils.js'
import { logger } from '../utils/logger.js'
import { AnyMessageContent } from '@whiskeysockets/baileys'
import { mediaService } from '../services/media.service.js'

export const sendCommand = new Command('send')
  .description('Send messages to a contact or group')

// Wait for the connection to be fully open before sending
async function connectAndExecute(storeDir: string, action: (sock: any) => Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    let executed = false

    baileysService.connect({
      storeDir,
      onConnectionUpdate: async (update) => {
        const { connection } = update
        if (connection === 'open' && !executed) {
          executed = true
          try {
            const sock = baileysService.getSocket()
            await action(sock)
            // Wait a moment for the message to be dispatched over the wire
            setTimeout(() => {
              baileysService.disconnect()
              resolve()
            }, 2000)
          } catch (err) {
            reject(err)
          }
        }
      }
    }).catch(reject)
  })
}

// Subcommand: send text
sendCommand
  .command('text')
  .description('Send a text message')
  .requiredOption('--to <number>', 'Recipient phone number or JID')
  .requiredOption('--message <text>', 'Text content of the message')
  .option('--quote <msg_id>', 'ID of the message to quote')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (options, cmd) => {
    const opts = cmd.optsWithGlobals()
    const isJson = opts.json
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(options.to)
    
    try {
      await connectAndExecute(storeDir, async (sock) => {
        let finalJid = jid
        if (finalJid.endsWith('@s.whatsapp.net')) {
          const waResult = await sock.onWhatsApp(finalJid)
          if (waResult && waResult.length > 0 && waResult[0].exists) {
            finalJid = waResult[0].jid
          }
        }

        if (!isJson) logger.info({ to: finalJid }, 'Sending text message...')
        
        const content: AnyMessageContent = { text: options.message }
        
        const sendOpts: any = {}
        if (options.quote) {
          sendOpts.quoted = {
            key: { id: options.quote, remoteJid: finalJid, fromMe: false },
            message: { conversation: '' } 
          }
        }

        const sentMsg = await sock.sendMessage(finalJid, content, sendOpts)
        
        if (isJson) {
          process.stdout.write(JSON.stringify({ success: true, id: sentMsg?.key.id, to: finalJid }) + '\n')
        } else {
          logger.info({ id: sentMsg?.key.id }, 'Message sent successfully')
        }
      })
      process.exit(0)
    } catch (err) {
      logger.error({ err }, 'Failed to send text message')
      process.exit(1)
    }
  })

// Subcommand: send file
sendCommand
  .command('file')
  .description('Send a media file (image, video, document, audio)')
  .requiredOption('--to <number>', 'Recipient phone number or JID')
  .requiredOption('--file <path>', 'Path to the local file to send')
  .option('--caption <caption>', 'Optional caption for images/videos/documents')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (options, cmd) => {
    const opts = cmd.optsWithGlobals()
    const isJson = opts.json
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(options.to)
    
    try {
      await connectAndExecute(storeDir, async (sock) => {
        let finalJid = jid
        if (finalJid.endsWith('@s.whatsapp.net')) {
          const waResult = await sock.onWhatsApp(finalJid)
          if (waResult && waResult.length > 0 && waResult[0].exists) {
            finalJid = waResult[0].jid
          }
        }

        if (!isJson) logger.info({ to: finalJid, file: options.file }, 'Preparing to send file...')
        
        const content = await mediaService.prepareMediaContent(options.file, options.caption)
        const sentMsg = await sock.sendMessage(finalJid, content)
        
        if (isJson) {
          process.stdout.write(JSON.stringify({ success: true, id: sentMsg?.key.id, to: finalJid, file: options.file }) + '\n')
        } else {
          logger.info({ id: sentMsg?.key.id }, 'File sent successfully')
        }
      })
      process.exit(0)
    } catch (err) {
      logger.error({ err }, 'Failed to send file')
      process.exit(1)
    }
  })

// Subcommand: send react
sendCommand
  .command('react')
  .description('React to a specific message')
  .requiredOption('--to <number>', 'Chat JID where the message is located')
  .requiredOption('--message-id <msg_id>', 'ID of the message to react to')
  .requiredOption('--emoji <emoji>', 'Emoji to use (use empty string to remove reaction)')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (options, cmd) => {
    const opts = cmd.optsWithGlobals()
    const isJson = opts.json
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(options.to)
    
    try {
      await connectAndExecute(storeDir, async (sock) => {
        if (!isJson) logger.info({ to: jid, msgId: options.messageId, emoji: options.emoji }, 'Sending reaction...')
        
        const content = {
          react: {
            text: options.emoji, // empty string removes the reaction
            key: { id: options.messageId, remoteJid: jid, fromMe: false }
          }
        }

        await sock.sendMessage(jid, content)
        
        if (isJson) {
          process.stdout.write(JSON.stringify({ success: true, to: jid, messageId: options.messageId, emoji: options.emoji }) + '\n')
        } else {
          logger.info('Reaction sent successfully')
        }
      })
      process.exit(0)
    } catch (err) {
      logger.error({ err }, 'Failed to send reaction')
      process.exit(1)
    }
  })
