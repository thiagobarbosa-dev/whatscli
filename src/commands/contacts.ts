import { Command } from 'commander'
import { contactStore } from '../store/contact.store.js'
import { defaultStoreDir, normalizeJid } from '../utils/jid.utils.js'
import { outputSuccess } from '../output/formatter.js'

export const contactsCommand = new Command('contacts')
  .description('Manage and search contacts')

contactsCommand
  .command('search')
  .description('Search contacts locally by name or JID')
  .argument('<query>', 'Search term')
  .option('--json', 'Output raw JSON array')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (query, options, cmd) => {
    // The --json flag might be global, check parent
    const isJson = options.json || cmd.parent?.opts()?.json

    try {
      const results = contactStore.search(query)

      if (isJson) {
        console.log(JSON.stringify(results))
        return
      }

      if (results.length === 0) {
        console.log('No contacts found matching the query.')
        return
      }

      console.log(`\nFound ${results.length} contacts:\n`)
      for (const c of results) {
        const nameDisplay = c.name || c.short_name || c.pushname || 'Unknown'
        console.log(`- ${nameDisplay} (${c.jid})`)
      }
      console.log('')
    } catch (err) {
      console.error('Failed to search contacts', err)
      process.exit(1)
    }
  })

contactsCommand
  .command('show')
  .description('Show details for a specific contact JID')
  .argument('<jid>', 'Contact JID or Phone Number')
  .option('--json', 'Output raw JSON')
  .action(async (jidInput, options, cmd) => {
    const isJson = options.json || cmd.parent?.opts()?.json
    const jid = normalizeJid(jidInput)

    try {
      const contact = contactStore.get(jid)

      if (!contact) {
        console.error('Contact not found in local database.')
        process.exit(1)
      }

      if (isJson) {
        console.log(JSON.stringify(contact))
        return
      }

      console.log(`\nContact Details:`)
      console.log(`  JID:        ${contact.jid}`)
      console.log(`  Name:       ${contact.name || 'N/A'}`)
      console.log(`  Short Name: ${contact.short_name || 'N/A'}`)
      console.log(`  Pushname:   ${contact.pushname || 'N/A'}`)
      console.log(`  Updated:    ${new Date(contact.updated_at * 1000).toLocaleString()}\n`)
    } catch (err) {
      console.error('Failed to get contact details', err)
      process.exit(1)
    }
  })
