import { Command } from 'commander'
import { chatStore } from '../store/chat.store.js'
import { normalizeJid } from '../utils/jid.utils.js'


export const chatsCommand = new Command('chats')
  .description('View active conversations (chats)')

chatsCommand
  .command('list')
  .description('List recent active chats')
  .option('--limit <number>', 'Number of chats to show', '50')
  .option('--offset <number>', 'Pagination offset', '0')
  .option('--json', 'Output raw JSON array')
  .action(async (options, cmd) => {
    const opts = cmd.optsWithGlobals()
    const isJson = opts.json
    const limit = parseInt(options.limit, 10)
    const offset = parseInt(options.offset, 10)

    try {
      const results = chatStore.list({ limit, offset })

      if (isJson) {
        process.stdout.write(JSON.stringify(results) + '\n')
        process.exit(0)
      }

      if (results.length === 0) {
        console.log('No recent chats found.')
        process.exit(0)
      }

      console.log(`\nRecent Chats:\n`)
      for (const c of results) {
        const time = c.last_message_at ? new Date(c.last_message_at * 1000).toLocaleString() : 'Unknown'
        const typeBadge = c.is_group ? '[Group]' : '[User]'
        const nameDisplay = c.name || c.jid
        const unread = c.unread_count > 0 ? `(${c.unread_count} unread)` : ''
        
        console.log(`${typeBadge} ${nameDisplay} ${unread} - Last active: ${time}`)
        console.log(`   JID: ${c.jid}\n`)
      }
      process.exit(0)
    } catch (err) {
      console.error('Failed to list chats', err)
      process.exit(1)
    }
  })

chatsCommand
  .command('show')
  .description('Show details for a specific chat JID')
  .argument('<jid>', 'Chat JID or Phone Number')
  .option('--json', 'Output raw JSON')
  .action(async (jidInput, options, cmd) => {
    const opts = cmd.optsWithGlobals()
    const isJson = opts.json
    const jid = normalizeJid(jidInput)

    try {
      const chat = chatStore.get(jid)

      if (!chat) {
        process.stderr.write('Error: Chat not found in local database.\n')
        process.exit(1)
      }

      if (isJson) {
        process.stdout.write(JSON.stringify(chat) + '\n')
        process.exit(0)
      }

      console.log(`\nChat Details:`)
      console.log(`  JID:          ${chat.jid}`)
      console.log(`  Name:         ${chat.name || 'N/A'}`)
      console.log(`  Is Group:     ${chat.is_group ? 'Yes' : 'No'}`)
      console.log(`  Unread Count: ${chat.unread_count}`)
      console.log(`  Last Active:  ${chat.last_message_at ? new Date(chat.last_message_at * 1000).toLocaleString() : 'N/A'}\n`)
      process.exit(0)
    } catch (err) {
      console.error('Failed to get chat details', err)
      process.exit(1)
    }
  })
