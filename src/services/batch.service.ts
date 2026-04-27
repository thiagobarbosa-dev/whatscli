import { baileysService } from './baileys.service.js'
import { logger } from '../utils/logger.js'
import { normalizeJid } from '../utils/jid.utils.js'

export interface BulkMessageItem {
  jid: string
  name?: string
  [key: string]: any
}

export interface BatchOptions {
  minDelay: number
  maxDelay: number
  typingSpeed: number
  dryRun?: boolean
}

export class BatchService {
  /**
   * Parse spintax in a string: {Hello|Hi|Hey} there!
   */
  parseSpintax(text: string): string {
    return text.replace(/\{([^{}]+)\}/g, (_, choices) => {
      const parts = choices.split('|')
      return parts[Math.floor(Math.random() * parts.length)]
    })
  }

  /**
   * Replace placeholders like {{name}}
   */
  injectVariables(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      return data[key.trim()] || ''
    })
  }

  /**
   * Calculate typing duration based on word count and WPM
   */
  calculateTypingDuration(text: string, wpm: number): number {
    const words = text.trim().split(/\s+/).length
    const minutes = words / wpm
    return Math.floor(minutes * 60 * 1000) // in milliseconds
  }

  /**
   * Send bulk messages with stealth measures
   */
  async sendBulk(
    storeDir: string,
    items: BulkMessageItem[],
    messageTemplates: string[],
    options: BatchOptions
  ): Promise<void> {
    const { minDelay, maxDelay, typingSpeed, dryRun } = options

    if (dryRun) {
      logger.info('--- DRY RUN MODE ---')
    }

    return new Promise((resolve, reject) => {
      let executed = false
      baileysService.connect({
        storeDir,
        onConnectionUpdate: async (update) => {
          if (update.connection === 'open' && !executed) {
            executed = true
            const sock = baileysService.getSocket()

            try {
              for (let i = 0; i < items.length; i++) {
                const item = items[i]
                
                // Stealth Measure 0: Resolve number to official JID/LID
                let targetJid = normalizeJid(item.jid)
                
                // If it looks like a phone number, ask WhatsApp for the official ID
                if (!targetJid.includes('@g.us') && !targetJid.includes('@lid')) {
                  const phone = item.jid.replace(/\D/g, '')
                  logger.debug({ phone }, 'Resolving phone number on WhatsApp...')
                  const results = await sock.onWhatsApp(phone)
                  if (!results || results.length === 0 || !results[0].exists) {
                    logger.warn({ phone }, `Number ${phone} does not exist on WhatsApp. Skipping.`)
                    continue
                  }
                  targetJid = results[0].jid
                  logger.debug({ phone, resolvedJid: targetJid }, 'Number resolved successfully')
                }
                
                // Select and process message
                const rawTemplate = messageTemplates[Math.floor(Math.random() * messageTemplates.length)]
                let finalMessage = this.injectVariables(rawTemplate, item)
                finalMessage = this.parseSpintax(finalMessage)

                if (dryRun) {
                  logger.info({ to: targetJid, message: finalMessage }, `[Dry Run] Would send to ${targetJid}`)
                } else {
                  // Stealth Measure 1: Typing Simulation
                  const typingMs = this.calculateTypingDuration(finalMessage, typingSpeed)
                  logger.info({ to: targetJid, durationMs: typingMs }, `Typing message for ${targetJid}...`)
                  
                  await sock.sendPresenceUpdate('composing', targetJid)
                  await new Promise(r => setTimeout(r, typingMs))
                  await sock.sendPresenceUpdate('paused', targetJid)

                  // Stealth Measure 2: Actual Send
                  await sock.sendMessage(targetJid, { text: finalMessage })
                  logger.info({ to: targetJid }, `Message sent to ${targetJid}`)
                }

                // Stealth Measure 3: Random Delay between messages (except for the last one)
                if (i < items.length - 1) {
                  const delaySec = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
                  logger.info({ nextIn: `${delaySec}s` }, 'Waiting before next message...')
                  await new Promise(r => setTimeout(r, delaySec * 1000))
                }
              }

              if (!dryRun) {
                // Give some time for the last message to clear
                await new Promise(r => setTimeout(r, 2000))
              }
              
              baileysService.disconnect()
              resolve()
            } catch (err) {
              logger.error(err, 'Error during bulk send')
              baileysService.disconnect()
              reject(err)
            }
          }
        }
      }).catch(reject)
    })
  }
}

export const batchService = new BatchService()
