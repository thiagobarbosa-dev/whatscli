import { Command } from 'commander'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

export const versionCommand = new Command('version')
  .description('Print package version and Baileys version')
  .action((opts: any, cmd: Command) => {
    const pkg = require('../../package.json')
    const baileysPkg = require('@whiskeysockets/baileys/package.json')

    const globalOpts = cmd.parent?.opts() ?? {}

    if (globalOpts['json']) {
      process.stdout.write(
        JSON.stringify({
          whatscli: pkg.version,
          baileys: baileysPkg.version,
        }) + '\n'
      )
    } else {
      console.log(`whatscli v${pkg.version}`)
      console.log(`@whiskeysockets/baileys v${baileysPkg.version}`)
    }
  })
