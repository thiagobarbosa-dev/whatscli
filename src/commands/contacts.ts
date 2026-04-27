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
    const opts = cmd.optsWithGlobals()
    const isJson = opts.json

    try {
      const results = contactStore.search(query)

      if (isJson) {
        process.stdout.write(JSON.stringify(results) + '\n')
        process.exit(0)
      }

      if (results.length === 0) {
        console.log('No contacts found matching the query.')
        process.exit(0)
      }

      console.log(`\nFound ${results.length} contacts:\n`)
      for (const c of results) {
        const nameDisplay = c.name || c.short_name || c.pushname || 'Unknown'
        console.log(`- ${nameDisplay} (${c.jid})`)
      }
      console.log('')
      process.exit(0)
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
    const opts = cmd.optsWithGlobals()
    const isJson = opts.json
    const jid = normalizeJid(jidInput)

    try {
      const contact = contactStore.get(jid)

      if (!contact) {
        process.stderr.write('Error: Contact not found in local database.\n')
        process.exit(1)
      }

      if (isJson) {
        process.stdout.write(JSON.stringify(contact) + '\n')
        process.exit(0)
      }

      console.log(`\nContact Details:`)
      console.log(`  JID:        ${contact.jid}`)
      if (contact.lid && contact.lid !== contact.jid) {
        console.log(`  LID:        ${contact.lid}`)
      }
      if (contact.pn_jid && contact.pn_jid !== contact.jid) {
        console.log(`  Phone JID:  ${contact.pn_jid}`)
      }
      console.log(`  Name:       ${contact.name || 'N/A'}`)
      console.log(`  Short Name: ${contact.short_name || 'N/A'}`)
      console.log(`  Pushname:   ${contact.pushname || 'N/A'}`)
      console.log(`  Updated:    ${new Date(contact.updated_at * 1000).toLocaleString()}\n`)
      process.exit(0)
    } catch (err) {
      console.error('Failed to get contact details', err)
      process.exit(1)
    }
  })
