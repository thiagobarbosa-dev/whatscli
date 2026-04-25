import { baileysService } from './src/services/baileys.service'
import { defaultStoreDir } from './src/utils/jid.utils'

async function findGroup() {
  const storeDir = defaultStoreDir()
  console.log('Connecting to fetch groups...')
  
  baileysService.connect({
    storeDir,
    onConnectionUpdate: async (update) => {
      if (update.connection === 'open') {
        const sock = baileysService.getSocket()
        console.log('Connected! Fetching groups...')
        
        try {
          const groups = await sock.groupFetchAllParticipating()
          for (const [jid, group] of Object.entries(groups)) {
            console.log(`- ${group.subject} (${jid})`)
          }
        } catch (err) {
          console.error(err)
        }
        
        baileysService.disconnect()
        process.exit(0)
      }
    }
  })
}

findGroup()
