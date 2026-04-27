import { baileysService } from './baileys.service.js'
import { GroupMetadata, ParticipantAction } from '@whiskeysockets/baileys'
import { normalizeJid } from '../utils/jid.utils.js'
import { chatStore } from '../store/chat.store.js'

export class GroupService {
  async getGroupMetadata(storeDir: string, groupJid: string): Promise<GroupMetadata> {
    // If we already have a socket, reuse it
    try {
      const sock = baileysService.getSocket()
      const metadata = await sock.groupMetadata(groupJid)
      
      chatStore.upsert({
        jid: groupJid,
        name: metadata.subject,
        unread_count: 0,
        last_message_at: metadata.creation || null,
        is_group: 1
      })

      // Proactively update contact store with participant info (LID/JID mapping)
      if (metadata.participants) {
        const { contactStore } = await import('../store/contact.store.js')
        for (const p of metadata.participants) {
          contactStore.upsert({
            jid: p.id,
            name: null,
            short_name: null,
            pushname: null,
            lid: (p as any).lid || (p.id.endsWith('@lid') ? p.id : null),
            pn_jid: (p as any).pnJid || (p.id.endsWith('@s.whatsapp.net') ? p.id : null)
          })
        }
      }

      return metadata
    } catch (err) {
      // No active socket or error fetching, proceed with standalone connection
    }

    return new Promise((resolve, reject) => {
      let executed = false
      baileysService.connect({
        storeDir,
        onConnectionUpdate: async (update) => {
          if (update.connection === 'open' && !executed) {
            executed = true
            try {
              const sock = baileysService.getSocket()
              const metadata = await sock.groupMetadata(groupJid)
              
              // Persist group to store
              chatStore.upsert({
                jid: groupJid,
                name: metadata.subject,
                unread_count: 0,
                last_message_at: metadata.creation || null,
                is_group: 1
              })

              // Proactively update contact store with participant info (LID/JID mapping)
              if (metadata.participants) {
                const { contactStore } = await import('../store/contact.store.js')
                for (const p of metadata.participants) {
                  contactStore.upsert({
                    jid: p.id,
                    name: null, // We might not have the name here
                    short_name: null,
                    pushname: null,
                    lid: (p as any).lid || (p.id.endsWith('@lid') ? p.id : null),
                    pn_jid: (p as any).pnJid || (p.id.endsWith('@s.whatsapp.net') ? p.id : null)
                  })
                }
              }

              setTimeout(() => baileysService.disconnect(), 1000)
              resolve(metadata)
            } catch (err) {
              reject(err)
            }
          }
        }
      }).catch(reject)
    })
  }

  async updateSubject(storeDir: string, groupJid: string, subject: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let executed = false
      baileysService.connect({
        storeDir,
        onConnectionUpdate: async (update) => {
          if (update.connection === 'open' && !executed) {
            executed = true
            try {
              const sock = baileysService.getSocket()
              await sock.groupUpdateSubject(groupJid, subject)
              setTimeout(() => baileysService.disconnect(), 1000)
              resolve()
            } catch (err) {
              reject(err)
            }
          }
        }
      }).catch(reject)
    })
  }

  async leaveGroup(storeDir: string, groupJid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let executed = false
      baileysService.connect({
        storeDir,
        onConnectionUpdate: async (update) => {
          if (update.connection === 'open' && !executed) {
            executed = true
            try {
              const sock = baileysService.getSocket()
              await sock.groupLeave(groupJid)
              setTimeout(() => baileysService.disconnect(), 1000)
              resolve()
            } catch (err) {
              reject(err)
            }
          }
        }
      }).catch(reject)
    })
  }

  async updateParticipants(
    storeDir: string, 
    groupJid: string, 
    participants: string[], 
    action: ParticipantAction
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let executed = false
      baileysService.connect({
        storeDir,
        onConnectionUpdate: async (update) => {
          if (update.connection === 'open' && !executed) {
            executed = true
            try {
              const sock = baileysService.getSocket()
              const jids = participants.map(normalizeJid)
              await sock.groupParticipantsUpdate(groupJid, jids, action)
              setTimeout(() => baileysService.disconnect(), 1000)
              resolve()
            } catch (err) {
              reject(err)
            }
          }
        }
      }).catch(reject)
    })
  }
}

export const groupService = new GroupService()
