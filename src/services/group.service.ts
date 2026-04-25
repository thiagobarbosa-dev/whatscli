import { baileysService } from './baileys.service'
import { GroupMetadata, ParticipantAction } from '@whiskeysockets/baileys'
import { normalizeJid } from '@/utils/jid.utils'

export class GroupService {
  async getGroupMetadata(storeDir: string, groupJid: string): Promise<GroupMetadata> {
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
