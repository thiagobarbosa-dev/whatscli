import { useMultiFileAuthState } from '@whiskeysockets/baileys'
import path from 'path'
import fs from 'fs'
import { logger } from '@/utils/logger'

/** Returns the path to the auth directory inside the store. */
function authDir(storeDir: string): string {
  return path.join(storeDir, 'auth')
}

/**
 * Load the Baileys multi-file auth state from the store directory.
 * The auth directory is created with restricted permissions (0o700).
 */
export async function getAuthState(storeDir: string) {
  const dir = authDir(storeDir)

  // Create with secure permissions — auth files are sensitive
  fs.mkdirSync(dir, { recursive: true })
  fs.chmodSync(dir, 0o700)

  logger.debug({ dir }, 'Loading auth state')
  return useMultiFileAuthState(dir)
}

/** Returns true if a valid credentials file exists in the store. */
export function hasAuthState(storeDir: string): boolean {
  const credsPath = path.join(authDir(storeDir), 'creds.json')
  return fs.existsSync(credsPath)
}

/**
 * Remove all auth state files, effectively logging out.
 * The user will need to run `whatscli auth` again after this.
 */
export function clearAuthState(storeDir: string): void {
  const dir = authDir(storeDir)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    logger.debug({ dir }, 'Auth state cleared')
  }
}
