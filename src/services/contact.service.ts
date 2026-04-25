import { Contact, Chat } from '@whiskeysockets/baileys'
import { contactStore } from '@/store/contact.store'
import { chatStore } from '@/store/chat.store'
import { normalizeJid } from '@/utils/jid.utils'
import { logger } from '@/utils/logger'

export class ContactService {
  handleContactUpsert(contacts: Contact[]): void {
    for (const c of contacts) {
      if (!c.id) continue
      const jid = normalizeJid(c.id)
      
      contactStore.upsert({
        jid,
        name: c.name || null,
        short_name: c.notify || null, // notify is typically the pushname, but Baileys maps it loosely
        pushname: c.notify || null
      })
    }
  }

  handleContactUpdate(contacts: Partial<Contact>[]): void {
    for (const c of contacts) {
      if (!c.id) continue
      const jid = normalizeJid(c.id)
      
      // We read the existing contact so we don't nullify fields if the update is partial
      const existing = contactStore.get(jid)
      
      contactStore.upsert({
        jid,
        name: c.name !== undefined ? c.name : (existing?.name || null),
        short_name: c.notify !== undefined ? c.notify : (existing?.short_name || null),
        pushname: c.notify !== undefined ? c.notify : (existing?.pushname || null)
      })
    }
  }

  handleChatUpsert(chats: Chat[]): void {
    for (const c of chats) {
      if (!c.id) continue
      const jid = normalizeJid(c.id)
      
      chatStore.upsert({
        jid,
        name: c.name || null,
        unread_count: c.unreadCount ?? 0,
        last_message_at: c.conversationTimestamp ? 
          (typeof c.conversationTimestamp === 'number' ? c.conversationTimestamp : Number(c.conversationTimestamp)) : null
      })
    }
  }

  handleChatUpdate(chats: Partial<Chat>[]): void {
    for (const c of chats) {
      if (!c.id) continue
      const jid = normalizeJid(c.id)
      
      const existing = chatStore.get(jid)
      
      chatStore.upsert({
        jid,
        name: c.name !== undefined ? c.name : (existing?.name || null),
        unread_count: (c.unreadCount ?? existing?.unread_count) ?? 0,
        last_message_at: c.conversationTimestamp ? 
          (typeof c.conversationTimestamp === 'number' ? c.conversationTimestamp : Number(c.conversationTimestamp)) : (existing?.last_message_at || null)
      })
    }
  }
}

export const contactService = new ContactService()
