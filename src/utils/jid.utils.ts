import os from 'os'
import path from 'path'

/** Default data store directory respecting WHATSCLI_STORE_DIR env override */
export function defaultStoreDir(): string {
  return process.env.WHATSCLI_STORE_DIR ?? path.join(os.homedir(), '.whatscli')
}

/**
 * Normalize a phone number or partial JID to a full WhatsApp JID.
 * The full international number (with country code) is required.
 * Examples:
 *   "5511999999999"                → "5511999999999@s.whatsapp.net"
 *   "5511999999999@s.whatsapp.net" → unchanged
 *   "1234567890@g.us"              → unchanged (group JID)
 */
export function normalizeJid(input: string): string {
  // Already a full JID — pass through
  if (input.includes('@')) return input

  // Strip any non-digit characters (spaces, dashes, parentheses)
  const digits = input.replace(/\D/g, '')

  if (digits.length < 10) {
    throw new Error(
      `Invalid phone number "${input}". Please include the full international number with country code (e.g. 5511999999999).`
    )
  }

  return `${digits}@s.whatsapp.net`
}

/** Extract the phone number from a JID */
export function jidToPhone(jid: string): string {
  return jid.split('@')[0]
}

/** Returns true if the JID is a group */
export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us')
}
