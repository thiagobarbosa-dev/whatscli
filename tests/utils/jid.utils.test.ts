import { describe, it, expect } from 'vitest'
import { normalizeJid, jidToPhone, isGroupJid, defaultStoreDir } from '../../src/utils/jid.utils'

describe('normalizeJid', () => {
  it('passes through a full s.whatsapp.net JID unchanged', () => {
    const jid = '5511999999999@s.whatsapp.net'
    expect(normalizeJid(jid)).toBe(jid)
  })

  it('passes through a group JID unchanged', () => {
    const jid = '120363092701757641@g.us'
    expect(normalizeJid(jid)).toBe(jid)
  })

  it('converts a full international number to JID', () => {
    expect(normalizeJid('5511999999999')).toBe('5511999999999@s.whatsapp.net')
  })

  it('strips dashes and spaces from phone numbers', () => {
    expect(normalizeJid('+55 11 99999-9999')).toBe('5511999999999@s.whatsapp.net')
  })

  it('strips parentheses from phone numbers', () => {
    expect(normalizeJid('(11) 99999-9999')).toBe('11999999999@s.whatsapp.net')
  })

  it('throws for numbers that are too short (< 10 digits)', () => {
    expect(() => normalizeJid('123')).toThrow(/full international number/)
  })

  it('throws for clearly invalid inputs', () => {
    expect(() => normalizeJid('abc')).toThrow()
  })
})

describe('jidToPhone', () => {
  it('extracts phone from a user JID', () => {
    expect(jidToPhone('5511999999999@s.whatsapp.net')).toBe('5511999999999')
  })

  it('extracts the ID part from a group JID', () => {
    expect(jidToPhone('120363092701757641@g.us')).toBe('120363092701757641')
  })
})

describe('isGroupJid', () => {
  it('returns true for group JIDs', () => {
    expect(isGroupJid('120363092701757641@g.us')).toBe(true)
  })

  it('returns false for user JIDs', () => {
    expect(isGroupJid('5511999999999@s.whatsapp.net')).toBe(false)
  })
})

describe('defaultStoreDir', () => {
  it('returns a non-empty string path', () => {
    const dir = defaultStoreDir()
    expect(typeof dir).toBe('string')
    expect(dir.length).toBeGreaterThan(0)
  })

  it('respects WHATSCLI_STORE_DIR env override', () => {
    const original = process.env.WHATSCLI_STORE_DIR
    process.env.WHATSCLI_STORE_DIR = '/tmp/test-store'
    expect(defaultStoreDir()).toBe('/tmp/test-store')
    process.env.WHATSCLI_STORE_DIR = original
  })
})
