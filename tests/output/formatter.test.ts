import { describe, it, expect } from 'vitest'
import { enforceSchema } from '../../src/output/formatter'

describe('enforceSchema (OpenClaw output)', () => {
  it('maps message record fields to OpenClaw schema', () => {
    const raw = {
      id: 'MSG123',
      chat_jid: '5511999999999@s.whatsapp.net',
      chat_name: 'My Chat',
      sender_jid: '5521888888888@s.whatsapp.net',
      sender_name: 'Alice',
      from_me: false,
      timestamp: 1714000000,
      type: 'text',
      content: 'Hello!',
      quoted_id: null,
      media_path: null,
      raw_json: '{}',  // must NOT appear in output
    }

    const result = enforceSchema(raw)

    expect(result).toEqual({
      id: 'MSG123',
      chat: '5511999999999@s.whatsapp.net',
      chat_name: 'My Chat',
      sender: '5521888888888@s.whatsapp.net',
      sender_name: 'Alice',
      from_me: false,
      timestamp: 1714000000,
      type: 'text',
      content: 'Hello!',
      quoted_id: null,
      media_path: null,
    })
  })

  it('does NOT include raw_json in output', () => {
    const raw = {
      id: 'X', chat_jid: 'a@s.whatsapp.net', sender_jid: 'b@s.whatsapp.net',
      from_me: false, timestamp: 0, type: 'text', content: '', raw_json: 'SECRET'
    }
    const result = enforceSchema(raw)
    expect(result).not.toHaveProperty('raw_json')
  })

  it('passes non-message objects through unchanged', () => {
    const plain = { foo: 'bar', count: 42 }
    expect(enforceSchema(plain)).toEqual(plain)
  })

  it('defaults null fields gracefully', () => {
    const raw = {
      id: 'MSG456',
      chat_jid: '5511@s.whatsapp.net',
      chat_name: undefined,
      sender_jid: '5522@s.whatsapp.net',
      sender_name: undefined,
      from_me: 1,  // integer from SQLite
      timestamp: 100,
      type: 'image',
      content: null,
      quoted_id: undefined,
      media_path: '/tmp/img.jpg',
      raw_json: '{}'
    }
    const result = enforceSchema(raw)
    expect(result.chat_name).toBe('')
    expect(result.sender_name).toBe('')
    expect(result.from_me).toBe(true)
    expect(result.quoted_id).toBeNull()
  })
})
