import { Command } from 'commander'
import { groupService } from '../services/group.service.js'
import { chatStore } from '../store/chat.store.js'
import { contactStore } from '../store/contact.store.js'
import { normalizeJid, defaultStoreDir } from '../utils/jid.utils.js'
import { ParticipantAction } from '@whiskeysockets/baileys'

export const groupsCommand = new Command('groups')
  .description('Manage WhatsApp groups')

groupsCommand
  .command('list')
  .description('List all groups you are part of')
  .option('--query <text>', 'Filter groups by name or JID')
  .option('--json', 'Output raw JSON array')
  .action(async (options, cmd) => {
    const isJson = options.json || cmd.parent?.opts()?.json

    try {
      let results: any[]
      if (options.query) {
        results = chatStore.search(options.query)
      } else {
        results = chatStore.list({ limit: 1000 }).filter(c => c.is_group === 1)
      }

      if (isJson) {
        console.log(JSON.stringify(results))
        return
      }

      if (results.length === 0) {
        console.log(options.query ? `No groups found matching "${options.query}".` : 'No groups found.')
        return
      }

      console.log(`\nGroups (${results.length}):\n`)
      for (const c of results) {
        const nameDisplay = c.name || c.jid
        console.log(`- ${nameDisplay} (${c.jid})`)
      }
      console.log('')
    } catch (err) {
      console.error('Failed to list groups', err)
      process.exit(1)
    }
  })

groupsCommand
  .command('search')
  .description('Search groups locally by name or JID')
  .argument('<query>', 'Search term')
  .option('--json', 'Output raw JSON array')
  .action(async (query, options, cmd) => {
    const isJson = options.json || cmd.parent?.opts()?.json

    try {
      const results = chatStore.search(query)

      if (isJson) {
        console.log(JSON.stringify(results))
        return
      }

      if (results.length === 0) {
        console.log(`No groups found matching "${query}".`)
        return
      }

      console.log(`\nFound ${results.length} groups:\n`)
      for (const c of results) {
        const nameDisplay = c.name || c.jid
        console.log(`- ${nameDisplay} (${c.jid})`)
      }
      console.log('')
    } catch (err) {
      console.error('Failed to search groups', err)
      process.exit(1)
    }
  })

groupsCommand
  .command('info')
  .description('Show detailed metadata and participants for a group')
  .argument('<jid>', 'Group JID')
  .option('--json', 'Output raw JSON')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (jidInput, options, cmd) => {
    const isJson = options.json || cmd.parent?.opts()?.json
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(jidInput)

    if (!jid.endsWith('@g.us')) {
      console.error('Invalid Group JID. Must end with @g.us')
      process.exit(1)
    }

    try {
      if (!isJson) console.log(`Fetching metadata for ${jid}...`)
      const metadata = await groupService.getGroupMetadata(storeDir, jid)

      if (isJson) {
        console.log(JSON.stringify(metadata))
        return
      }

      console.log(`\nGroup Info:`)
      console.log(`  Subject: ${metadata.subject}`)
      console.log(`  Owner:   ${metadata.owner || 'Unknown'}`)
      console.log(`  Created: ${new Date(metadata.creation! * 1000).toLocaleString()}`)
      console.log(`  Desc:    ${metadata.desc || 'No description'}\n`)
      
      console.log(`Participants (${metadata.participants.length}):`)
      for (const p of metadata.participants) {
        console.log(`  - ${p.id} ${p.admin ? `[${p.admin}]` : ''}`)
      }
      console.log('')
    } catch (err) {
      console.error('Failed to fetch group info', err)
      process.exit(1)
    }
  })

groupsCommand
  .command('members')
  .description('List all members of a group with their names (if known)')
  .argument('<jid>', 'Group JID')
  .option('--json', 'Output raw JSON')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (jidInput, options, cmd) => {
    const isJson = options.json || cmd.parent?.opts()?.json
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(jidInput)

    if (!jid.endsWith('@g.us')) {
      console.error('Invalid Group JID. Must end with @g.us')
      process.exit(1)
    }

    try {
      if (!isJson) console.log(`Fetching members for ${jid}...`)
      const metadata = await groupService.getGroupMetadata(storeDir, jid)
      
      const members = metadata.participants.map(p => {
        const contact = contactStore.get(p.id)
        // If the ID is a LID, check if we have a linked phone JID
        // If the ID is a Phone JID, check if we have a linked LID
        const linkedPhone = contact?.pn_jid || (p.id.endsWith('@s.whatsapp.net') ? p.id : null)
        const linkedLid = contact?.lid || (p.id.endsWith('@lid') ? p.id : null)

        return {
          jid: p.id,
          name: contact?.name || contact?.pushname || null,
          admin: p.admin || null,
          phone: linkedPhone,
          lid: linkedLid
        }
      })

      if (isJson) {
        console.log(JSON.stringify(members))
        return
      }

      console.log(`\nMembers of "${metadata.subject}" (${members.length}):\n`)
      for (const m of members) {
        const namePart = m.name ? `${m.name}` : 'Unknown'
        const adminPart = m.admin ? `[${m.admin}] ` : ''
        
        const phoneDisplay = m.phone ? m.phone.split('@')[0] : 'No Phone'
        const lidDisplay = m.lid ? ` (${m.lid})` : ''
        
        console.log(`- ${adminPart}${namePart}: ${phoneDisplay}${lidDisplay}`)
      }
      console.log('')
    } catch (err) {
      console.error('Failed to fetch group members', err)
      process.exit(1)
    }
  })

groupsCommand
  .command('rename')
  .description('Change the subject (name) of a group')
  .argument('<jid>', 'Group JID')
  .argument('<subject>', 'New group name')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (jidInput, subject, options) => {
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(jidInput)

    try {
      await groupService.updateSubject(storeDir, jid, subject)
      console.log('Group renamed successfully.')
    } catch (err) {
      console.error('Failed to rename group', err)
      process.exit(1)
    }
  })

groupsCommand
  .command('leave')
  .description('Leave a group')
  .argument('<jid>', 'Group JID')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (jidInput, options) => {
    const storeDir = options.dir ?? defaultStoreDir()
    const jid = normalizeJid(jidInput)

    try {
      await groupService.leaveGroup(storeDir, jid)
      console.log('Left group successfully.')
    } catch (err) {
      console.error('Failed to leave group', err)
      process.exit(1)
    }
  })

groupsCommand
  .command('participants')
  .description('Add, remove, promote, or demote participants')
  .argument('<action>', 'Action: add | remove | promote | demote')
  .argument('<group_jid>', 'Group JID')
  .argument('<participants...>', 'List of phone numbers or JIDs to apply the action to')
  .option('--dir <path>', 'Custom directory for auth state and db')
  .action(async (actionStr, groupJidInput, participants, options) => {
    const storeDir = options.dir ?? defaultStoreDir()
    const groupJid = normalizeJid(groupJidInput)
    const validActions = ['add', 'remove', 'promote', 'demote']

    if (!validActions.includes(actionStr)) {
      console.error(`Invalid action. Must be one of: ${validActions.join(', ')}`)
      process.exit(1)
    }

    try {
      await groupService.updateParticipants(storeDir, groupJid, participants, actionStr as ParticipantAction)
      console.log(`Successfully applied '${actionStr}' for participants.`)
    } catch (err) {
      console.error('Failed to update participants', err)
      process.exit(1)
    }
  })
