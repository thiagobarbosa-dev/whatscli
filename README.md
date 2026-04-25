# WhatsCLI

> WhatsApp Web CLI — a TypeScript alternative to [wacli](https://github.com/steipete/wacli), powered by [Baileys](https://github.com/WhiskeySockets/Baileys).

[![Node.js](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)
[![Baileys](https://img.shields.io/badge/Baileys-v7%2B-purple)](https://github.com/WhiskeySockets/Baileys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What is it

WhatsCLI is a command-line tool to automate WhatsApp Web. Focused on:

- 🔐 **Secure auth** — QR code login → session persisted locally
- 📥 **Offline sync** — message history stored in SQLite with FTS5 search
- 🔍 **Fast search** — full-text search without internet
- 📤 **Sending** — text, files, reactions, quoted replies
- 👥 **Management** — contacts, chats, groups
- 🤖 **OpenClaw-ready** — `--json` output optimized for [OpenClaw](https://openclaw.ai) ingestion

---

## Prerequisites

- Node.js >= 20.x
- npm >= 9.x

---

## Installation

```bash
git clone https://github.com/thiagobarbosa-dev/whatscli
cd whatscli
npm install
npm run build
```

---

## Quick Start

```bash
# 1. Authenticate (shows QR code)
whatscli auth

# 2. Sync messages
whatscli sync --once

# 3. Search messages
whatscli messages search "meeting" --json

# 4. List recent chats
whatscli chats list

# 5. Send a message
whatscli send text --to 5511999999999 --message "Hello!"

# Diagnostics
whatscli doctor
```

---

## Commands

| Group | Command | Description |
|-------|---------|-------------|
| **Auth** | `auth` | QR login, `auth status`, `auth logout` |
| **Sync** | `sync` | Sync messages (`--once` or `--follow`) |
| **Messages** | `messages list\|search\|show\|context` | List and search messages |
| **Send** | `send text\|file\|react` | Send message, file, or reaction |
| **Media** | `media download` | Download media from a message |
| **History** | `history backfill` | Request older history |
| **Contacts** | `contacts search\|show\|refresh` | Manage contacts |
| **Chats** | `chats list\|show` | List conversations |
| **Groups** | `groups list\|info\|rename\|leave\|...` | Manage groups |
| **Presence** | `presence typing\|paused` | Presence indicators |
| **Doctor** | `doctor` | Environment diagnostics |

### Global Flags

```
--store DIR      data directory (default: ~/.whatscli)
--json           JSON output (for scripts / OpenClaw)
--full           disable table truncation
--timeout DUR    timeout for non-sync commands
--read-only      block all write operations
```

---

## JSON Output (OpenClaw spec)

When using `--json` or piping, output follows this schema:

```json
{
  "id": "MSG_ID",
  "chat": "5511999999999@s.whatsapp.net",
  "sender": "5511999999999@s.whatsapp.net",
  "from_me": false,
  "timestamp": 1714000000,
  "type": "text",
  "content": "message content here",
  "quoted_id": null,
  "media_path": null
}
```

---

## Development

```bash
# Dev mode
npx ts-node src/index.ts --help

# Build
npm run build

# Lint
npm run lint
```

See [`Docs/`](./Docs/) for detailed architecture, roadmap, and implementation plan.

---

## Disclaimer

This project is not affiliated with WhatsApp. Use responsibly and in accordance with [WhatsApp's Terms of Service](https://www.whatsapp.com/legal/terms-of-service).

## License

[MIT](LICENSE)