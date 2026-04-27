import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { batchService, BulkMessageItem } from '../services/batch.service.js'
import { outputError, outputSuccess } from '../output/formatter.js'
import { defaultStoreDir } from '../utils/jid.utils.js'
import { logger } from '../utils/logger.js'

export const sendBulkCommand = new Command('send-bulk')
  .description('Send messages in bulk with anti-ban stealth measures')
  .argument('<file>', 'Path to JSON or CSV file with recipients')
  .option('--message <text...>', 'Message template(s). Supports spintax {a|b} and {{vars}}')
  .option('--min-delay <seconds>', 'Minimum delay between messages', '30')
  .option('--max-delay <seconds>', 'Maximum delay between messages', '90')
  .option('--typing-speed <wpm>', 'Words per minute for typing simulation', '40')
  .option('--dry-run', 'Simulation mode (no messages actually sent)', false)
  .action(async (fileArg: string, opts) => {
    const globalOpts = sendBulkCommand.parent?.opts() ?? {}
    const storeDir: string = globalOpts['store'] ?? defaultStoreDir()
    
    try {
      const filePath = path.resolve(fileArg)
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${fileArg}`)
      }

      let items: BulkMessageItem[] = []
      const ext = path.extname(filePath).toLowerCase()

      if (ext === '.json') {
        const content = fs.readFileSync(filePath, 'utf-8')
        items = JSON.parse(content)
      } else if (ext === '.csv') {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n').filter(l => l.trim())
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim())
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim())
            const item: any = {}
            headers.forEach((h, idx) => {
              item[h] = values[idx]
            })
            // Map common fields to jid if necessary
            if (!item.jid && item.phone) item.jid = item.phone
            if (item.jid) items.push(item)
          }
        }
      } else {
        throw new Error('Unsupported file format. Please use .json or .csv')
      }

      if (items.length === 0) {
        throw new Error('No recipients found in the file')
      }

      const templates = opts.message
      if (!templates || templates.length === 0) {
        throw new Error('Please provide at least one message template using --message')
      }

      logger.info({ count: items.length }, 'Starting bulk send process...')

      await batchService.sendBulk(storeDir, items, templates, {
        minDelay: parseInt(opts.minDelay),
        maxDelay: parseInt(opts.maxDelay),
        typingSpeed: parseInt(opts.typingSpeed),
        dryRun: opts.dryRun
      })

      outputSuccess(`Bulk send process completed for ${items.length} recipients.`, globalOpts)
    } catch (err: any) {
      logger.error(err, 'Bulk send failed')
      outputError(err.message, globalOpts)
      process.exit(1)
    }
  })
