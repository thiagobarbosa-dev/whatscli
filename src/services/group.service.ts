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
              
              // Persist to store so search works
              chatStore.upsert({
                jid: groupJid,
                name: metadata.subject,
                unread_count: 0,
                last_message_at: metadata.creation || null,
                is_group: 1
              })

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
