# WhatsCLI

> WhatsApp Web CLI — a TypeScript alternative to [wacli](https://github.com/steipete/wacli), powered by [Baileys](https://github.com/WhiskeySockets/Baileys).

[![CI](https://github.com/thiagobarbosa-dev/whatscli/actions/workflows/ci.yml/badge.svg)](https://github.com/thiagobarbosa-dev/whatscli/actions/workflows/ci.yml)
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
- 🚀 **Stealth Bulk Send** — automated safe messaging with random delays, typing simulation, and message rotation (spintax)
- 👥 **Management** — contacts, chats, groups
- 🇧🇷 **Smart JID** — automatic phone number resolution (fixes the Brazilian 9th digit ghost-chat issue)
- 🤖 **OpenClaw-ready** — `--json` output optimized for [OpenClaw](https://openclaw.ai) ingestion

---

> [!NOTE]
> **For AI Agents:** Detailed technical context, schema, and CLI guidelines for AI interactions are available in [Docs/AI_CONTEXT.md](./Docs/AI_CONTEXT.md).

---

## Prerequisites

- Node.js >= 20.x
- npm >= 9.x

---

## Requirements

- **Node.js**: >= 20.17.0 or >= 22.9.0 (LTS versions are highly recommended).
- **npm**: Compatible with the chosen Node.js version.
- **Native Modules**: If pre-built binaries for `sharp` are not available for your environment, ensure you have build tools installed (`make`, `g++`, `python`).

## Installation

### Via Homebrew (Recommended for macOS/Linux)

```bash
brew tap thiagobarbosa-dev/tap
brew install whatscli
```

### Via NPM (Global)

```bash
npm install -g @thiagobarbosa-dev/whatscli
```

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/thiagobarbosa-dev/whatscli.git
   cd whatscli
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Link for global usage:
   ```bash
   npm link
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

### `send text`
Send a plain text message to a JID or phone number.
```bash
whatscli send text "5511999998888" "Hello!"
```

### `send-bulk`
Send messages in bulk with mandatory anti-ban stealth measures. Supports `.json` and `.csv`.

```bash
whatscli send-bulk recipients.json --message "Hi {{name}}!" --min-delay 30 --max-delay 90
```

#### Recipient Formats

**JSON (`recipients.json`):**
```json
[
  { "jid": "5511999998888", "name": "Name" },
  { "jid": "5511977776666", "name": "Name" }
]
```

**CSV (`recipients.csv`):**
```csv
jid,name,city
5511999998888,Name,City Name
5511977776666,Name,City Name
```

- **Features**:
  - 🔄 **Spintax**: `{Hello|Hi|Hey} {{name}}!` will rotate greetings.
  - 🧪 **Variables**: Any key in JSON or column in CSV can be used as `{{key}}`.
  - 🕒 **Human-like**: Simulates "typing..." presence based on message length and WPM.
  - 🛡️ **Anti-Ban**: Mandatory randomized delays and server-side JID resolution.

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
| **Contacts** | `contacts search\|show` | Search and view contacts |
| **Chats** | `chats list\|show` | List conversations |
| **Groups** | `groups list\|search\|members\|info\|rename\|leave\|participants` | Manage groups and members |
| **Presence** | `presence typing\|recording\|paused` | Presence indicators |
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
  "chat": "120363123456789012@g.us",
  "chat_name": "Group Name",
  "sender": "5511912345678@s.whatsapp.net",
  "sender_name": "Sender Name",
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

---

## Disclaimer

This project is not affiliated with WhatsApp. Use responsibly and in accordance with [WhatsApp's Terms of Service](https://www.whatsapp.com/legal/terms-of-service).

## License

[MIT](LICENSE)