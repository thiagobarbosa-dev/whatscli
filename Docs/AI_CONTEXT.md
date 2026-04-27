# WhatsCLI — AI Project Context

This document provides a comprehensive overview of WhatsCLI for AI agents. Use this as a source of truth to understand the architecture, schema, and commands without exhaustive file discovery.

## 🏗️ Architecture Overview

WhatsCLI is a Node.js CLI tool for WhatsApp automation using **Baileys** as the engine and **SQLite** for local persistence.

- **Entry Point:** `src/index.ts` (Commander.js)
- **Services (`src/services/`):** Core logic (Baileys connection, Message handling, Contact resolution).
- **Stores (`src/store/`):** Persistence layer using SQLite. Abstracted from services.
- **Commands (`src/commands/`):** CLI orchestrators. Each file exports one command.
- **Utils (`src/utils/`):** JID normalization, logging (pino), and path management.

## 🗄️ Database Schema (SQLite)

Current Migration Version: **5**

### Table: `contacts`
Stores WhatsApp contacts and LID/JID mapping.
- `jid` (TEXT, PK): Primary identifier (Phone-based or LID-based).
- `name` (TEXT): Saved contact name.
- `short_name` (TEXT): Short name from WhatsApp.
- `pushname` (TEXT): Push name from WhatsApp.
- `lid` (TEXT): Identity-based JID (Local ID).
- `pn_jid` (TEXT): Phone-number-based JID linked to a LID.
- `updated_at` (INTEGER): Unix epoch.

### Table: `chats`
Stores conversations/groups.
- `jid` (TEXT, PK): Group JID (`@g.us`) or User JID.
- `name` (TEXT): Group subject or Contact name.
- `unread_count` (INTEGER): Count of unread messages.
- `last_message_at` (INTEGER): Timestamp of last message.
- `is_group` (INTEGER): 0 or 1.

### Table: `messages`
Stores message history for sync and search.
- `id` (TEXT, PK): Message ID.
- `chat_jid` (TEXT): Reference to `chats`.
- `sender_jid` (TEXT): Actual sender (useful in groups).
- `from_me` (INTEGER): 0 or 1.
- `timestamp` (INTEGER): Unix epoch.
- `type` (TEXT): Message type (text, image, etc.).
- `content` (TEXT): Extracted text content.
- `quoted_id` (TEXT): ID of the message being replied to.
- `media_path` (TEXT): Local path to downloaded media.
- `raw_json` (TEXT): Full Baileys WAMessage object.

## 💻 CLI Reference

### Session Management
- `auth login`: Generate QR Code to authenticate.
- `auth logout`: Terminate session and clear local data.

### Messaging
- `send <jid> <message>`: Send a text message.
- `sync [--once|--follow]`: Synchronize messages and contacts.

### Groups
- `groups list`: List all joined groups.
- `groups members <jid>`: List group participants with Name, Phone, and LID mapping.

### Contacts
- `contacts list`: List all saved contacts.
- `contacts show <jid>`: Show detailed info and LID/JID mapping.

## 🛠️ Development & Testing

### Local Scripts (`/scripts/`)
Temporary or debugging scripts (git-ignored).
- `scripts/test_lid_search.ts`: Verifies LID/JID mapping and search logic.

### Core Commands
- `npm run build`: Compile TypeScript to `dist/`.
- `npx tsx scripts/your-script.ts`: Run a test script without building.
- `LOG_LEVEL=debug`: Enable verbose logging for any command.
