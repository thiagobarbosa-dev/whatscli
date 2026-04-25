# Changelog

All notable changes to WhatsCLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Commit types follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [Unreleased]

### Added
- Initial project scaffold with `src/` folder structure
- `.gitignore` covering Node.js, TypeScript build artifacts, SQLite files,
  auth state, environment files, OS and editor files
- `README.md` with project overview, command reference and OpenClaw JSON output spec

---

## [0.2.0] - 2026-04-22

### Added
- `whatscli auth` — QR login with persistent multi-file auth_state
- `whatscli auth status` — check current session status
- `whatscli auth logout` — invalidate session and clean auth_state
- `whatscli doctor` — environment and connection diagnostics
- SQLite store with WAL mode and migration runner
- pino logger with pretty-print in development mode
- Global flags: --store, --json, --full, --read-only, --timeout

### Changed
- Converted SQLite storage to `node-sqlite3-wasm` for pure JS/WASM Node 25 compatibility without compilation issues

### Fixed
- n/a

## [0.3.0] - 2026-04-24

### Added
- `whatscli sync` with --once and --follow modes
- SQLite messages table with FTS5 full-text search
- `whatscli messages list` with chat, sender, date and direction filters
- `whatscli messages search <query>` with --chat, --has-media, --type filters
- `whatscli messages show` and `messages context`
- NDJSON output formatter for --json flag and non-TTY pipes
- JID normalization utility (phone number → WhatsApp JID)

## [0.4.0] - 2026-04-24

### Added
- `whatscli send text` — send plain text messages
- `whatscli send file` — send image/video/audio/document with optional caption
- `whatscli send react` — react to a message with an emoji
- `whatscli media download` — download media from a synced message
- `whatscli history backfill` — request older message history
- `whatscli presence typing`, `presence recording`, and `presence paused`

## [0.5.0] - 2026-04-24

### Added
- `whatscli contacts search/show`
- `whatscli chats list/show`
- `whatscli groups list/info/rename/leave`
- `whatscli groups participants add/remove/promote/demote`
- SQLite store for contacts and chats

### Fixed
- "Ghost chat" issue in Brazil (DDD with 9th digit) by adding `sock.onWhatsApp` Smart JID resolution before sending messages
- CLI 17-second hang and 428 Connection Replaced errors by implementing graceful `socket.end(undefined)` and immediate `process.exit(0)` upon send completion

## [0.6.0] - 2026-04-24

### Added
- `--read-only` flag globally enforced via `preAction` hook to block all commands that mutate WhatsApp state.
- `whatscli doctor --connect` to verify live end-to-end connection to WhatsApp.
- `whatscli version` command to display current `whatscli` and Baileys versions.
- Added `chat_name` and `sender_name` explicitly to OpenClaw JSON payload via FTS/SQLite JOINs.

### Changed
- Enforced strict `OpenClawOutput` interface in JSON mode, ensuring no data leaks of internal Baileys objects.
- Redirected pino `DEBUG` and `INFO` logs strictly to `stderr` to guarantee that `stdout` emits flawless NDJSON output.

<!--

### Added
- OpenClaw JSON output schema finalized and validated
- --read-only mode enforced across all write commands
- Consistent exit codes: 0 success / 1 error / 2 unauthenticated / 3 timeout
- `whatscli version` — prints package version and Baileys version

### Changed
- Complete README with full usage examples and OpenClaw integration guide
-->
