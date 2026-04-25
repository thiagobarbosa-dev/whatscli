import { WAMessage, isJidGroup } from '@whiskeysockets/baileys'
import { messageStore, MessageRecord } from '../store/message.store.js'
import { logger } from '../utils/logger.js'
import { normalizeJid } from '../utils/jid.utils.js'

export class MessageService {
  /**
   * Process an incoming Baileys message and save it to the store.
   * Critically: Separates chat_jid from sender_jid (fixing wacli limitations in groups).
   */
  async handleUpsert(msg: WAMessage): Promise<void> {
    if (!msg.message || !msg.key.remoteJid || !msg.key.id) {
      return // Ignore system/empty messages
    }

    const chatJid = normalizeJid(msg.key.remoteJid)
    const id = msg.key.id
    const fromMe = msg.key.fromMe ?? false
    
    // CRITICAL: Determine real sender
    // If fromMe: sender is us
    // If it's a group: the actual sender is participant
    // If it's a DM: the actual sender is the remoteJid
    let senderJid = chatJid
    if (fromMe) {
      // In fromMe messages, Baileys does not populate participant reliably depending on context
      // Actually, typically fromMe means WE sent it. However, OpenClaw expects the sender JID.
      // We will normalize finding our own JID later if necessary, but for now we tag as 'ME' or generic
      senderJid = 'ME' // Placeholder or actual JID if we fetch from state
    } else if (isJidGroup(chatJid)) {
      if (msg.key.participant) {
        senderJid = normalizeJid(msg.key.participant)
      } else {
        logger.warn({ id, chatJid }, 'Message from group misses participant JID')
      }
    }

    const timestamp =
      typeof msg.messageTimestamp === 'number'
        ? msg.messageTimestamp
        : Math.floor(Date.now() / 1000)

    const content = this._extractContent(msg.message)
    const type = Object.keys(msg.message)[0] || 'unknown'
    const quotedId = this._extractQuotedId(msg.message)

    const record: MessageRecord = {
      id,
      chat_jid: chatJid,
      sender_jid: senderJid,
      from_me: fromMe,
      timestamp,
      type,
      content,
      quoted_id: quotedId,
      media_path: null, // To be filled if downloaded
      raw_json: JSON.stringify(msg),
    }

    messageStore.upsert(record)
  }

  private _extractContent(message: any): string | null {
    if (!message) return null
    if (message.conversation) return message.conversation
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text
    if (message.imageMessage?.caption) return message.imageMessage.caption
    if (message.videoMessage?.caption) return message.videoMessage.caption
    if (message.documentMessage?.caption) return message.documentMessage.caption
    return null
  }

  private _extractQuotedId(message: any): string | null {
    if (!message) return null
    return message.extendedTextMessage?.contextInfo?.stanzaId || null
  }
}

export const messageService = new MessageService()
