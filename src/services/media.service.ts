import { AnyMessageContent, downloadMediaMessage, WAMessage } from '@whiskeysockets/baileys'
import mime from 'mime-types'
import fs from 'fs'
import path from 'path'
import { logger } from '@/utils/logger'
import { baileysService } from '@/services/baileys.service'

export class MediaService {
  /**
   * Prepares media content for sending based on file extension/mimetype.
   * Auto-detects image, video, audio, or document.
   */
  async prepareMediaContent(filePath: string, caption?: string): Promise<AnyMessageContent> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const mimeType = mime.lookup(filePath) || 'application/octet-stream'
    const buffer = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)

    if (mimeType.startsWith('image/')) {
      return { image: buffer, caption, mimetype: mimeType }
    } else if (mimeType.startsWith('video/')) {
      return { video: buffer, caption, mimetype: mimeType }
    } else if (mimeType.startsWith('audio/')) {
      // Sending as ptt (push to talk / voice note) if it's an ogg, otherwise standard audio
      const isVoiceNote = mimeType.includes('ogg')
      return { audio: buffer, mimetype: mimeType, ptt: isVoiceNote }
    } else {
      // Default to document for PDFs, zips, etc.
      return { document: buffer, mimetype: mimeType, fileName, caption }
    }
  }

  /**
   * Downloads media from a received message.
   */
  async downloadMedia(message: WAMessage, outputDir: string): Promise<string> {
    if (!message.message) {
      throw new Error('Message has no content')
    }

    logger.debug({ msgId: message.key.id }, 'Downloading media message')
    
    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: undefined as any,
          // Baileys might need a re-uploaded media fetch function in strict mode
          reuploadRequest: async () => {
            const sock = baileysService.getSocket()
            return sock.updateMediaMessage(message)
          }
        }
      )

      fs.mkdirSync(outputDir, { recursive: true })
      
      // Attempt to guess extension based on mimetype inside the message
      const msgContent = message.message
      const mediaKey = Object.keys(msgContent).find(k => k.endsWith('Message'))
      let ext = 'bin'
      
      if (mediaKey) {
        // @ts-ignore
        const mimeType = msgContent[mediaKey]?.mimetype
        if (mimeType) {
          ext = mime.extension(mimeType) || 'bin'
        }
      }

      const fileName = `${message.key.id}.${ext}`
      const outputPath = path.join(outputDir, fileName)
      
      fs.writeFileSync(outputPath, buffer as Buffer)
      logger.info({ outputPath }, 'Media downloaded successfully')
      
      return outputPath
    } catch (error) {
      logger.error({ err: error, msgId: message.key.id }, 'Failed to download media')
      throw error
    }
  }
}

export const mediaService = new MediaService()
