# Changelog

All notable changes to WhatsCLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Commit types follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [0.8.3] - 2026-04-25

### Fixed
- Handle `EPIPE` (Broken Pipe) errors gracefully when piping output to other commands (e.g., `head`), preventing Node.js crashes.

## [0.8.2] - 2026-04-25

### Fixed
- Resolve module path aliases (`@/`) at build-time using `tsc-alias`, eliminating runtime dependency on `tsconfig.json`.
- Remove `tsconfig-paths/register` from production entrypoint.

## [0.8.1] - 2026-04-25

### Fixed
- Resolve module path aliases (`@/`) in production builds using `tsconfig-paths`.
- Move `tsconfig-paths` to production dependencies.

## [0.8.0] - 2026-04-25

### Added
- GitHub Actions CI workflow — runs type-check and 17 unit tests on Node.js 20.x and 22.x on every push and PR.
- Security audit job in CI — blocks PRs if any critical vulnerability is detected.
- `.github/SECURITY.md` — responsible disclosure policy with private reporting via GitHub Security Advisories.

---

## [0.7.0] - 2026-04-25

### Added
- `"prepare": "npm run build"` script — enables `npm install -g` global installation.
- `"files"` whitelist in `package.json` — only ships `dist/`, `README.md`, `LICENSE`, and `CHANGELOG.md` to npm.
- `CONTRIBUTING.md` — setup guide, code style rules, and PR contribution workflow.
- Unit tests with Vitest — 17 tests covering `jid.utils.ts` and `output/formatter.ts`.

### Changed
- `Browsers.macOS` replaced with `Browsers.ubuntu` for cross-platform server compatibility.
- `normalizeJid` no longer assumes Brazil (+55) as default country code — full international number now required.
- Refactored dynamic `require()` calls in `messages.ts` to static imports.

### Fixed
- Patched critical `protobufjs` vulnerability (GHSA-xq3m-2v4x-88gg) via `npm audit fix`.
- Removed stray `list_groups.ts` debug file from repository root.
- Removed `package-lock.json` from `.gitignore` to guarantee reproducible installs.

---

## [0.6.0] - 2026-04-24

### Added
- `--read-only` flag globally enforced via `preAction` hook to block all commands that mutate WhatsApp state.
- `whatscli doctor --connect` to verify live end-to-end connection to WhatsApp.
- `whatscli version` command to display current `whatscli` and Baileys versions.
- `chat_name` and `sender_name` added to OpenClaw JSON payload via SQLite JOINs on contacts and chats tables.

### Changed
- Enforced strict `OpenClawOutput` interface in JSON mode — no internal Baileys fields leak to stdout.
- Redirected pino `DEBUG` and `INFO` logs strictly to `stderr` to guarantee flawless NDJSON output on `stdout`.

---

## [0.5.0] - 2026-04-24

### Added
- `whatscli contacts search/show` — search and view synced contacts.
- `whatscli chats list/show` — list and inspect conversations.
- `whatscli groups list/info/rename/leave` — group management commands.
- `whatscli groups participants add/remove/promote/demote` — participant management.
- SQLite tables for contacts and chats with migration runner.

### Fixed
- "Ghost chat" issue in Brazil (DDD with 9th digit) via `sock.onWhatsApp` Smart JID resolution before sending.
- CLI 17-second hang and 428 Connection Replaced errors via graceful `socket.end(undefined)` and `process.exit(0)`.

---

## [0.4.0] - 2026-04-24

### Added
- `whatscli send text` — send plain text messages.
- `whatscli send file` — send image/video/audio/document with optional caption.
- `whatscli send react` — react to a message with an emoji.
- `whatscli media download` — download media from a synced message.
- `whatscli history backfill` — request older message history from WhatsApp servers.
- `whatscli presence typing`, `presence recording`, and `presence paused`.

---

## [0.3.0] - 2026-04-24

### Added
- `whatscli sync` with `--once` and `--follow` modes.
- SQLite messages table with FTS5 full-text search.
- `whatscli messages list` with chat, sender, date, and direction filters.
- `whatscli messages search <query>` with `--chat`, `--has-media`, `--type` filters.
- `whatscli messages show` and `messages context`.
- NDJSON output formatter for `--json` flag and non-TTY pipes.
- JID normalization utility (phone number → WhatsApp JID).

---

## [0.2.0] - 2026-04-22

### Added
- `whatscli auth` — QR login with persistent multi-file auth_state.
- `whatscli auth status` — check current session status.
- `whatscli auth logout` — invalidate session and clean auth_state.
- `whatscli doctor` — environment and connection diagnostics.
- SQLite store with WAL mode and migration runner.
- pino logger with pretty-print in development mode.
- Global flags: `--store`, `--json`, `--full`, `--read-only`, `--timeout`.

### Changed
- Converted SQLite storage to `node-sqlite3-wasm` for pure JS/WASM Node.js 25 compatibility (no native compilation).

---

## [0.1.0] - 2026-04-22

### Added
- Initial project scaffold with `src/` folder structure.
- `.gitignore` covering Node.js, TypeScript build artifacts, SQLite files, auth state, environment files, OS and editor files.
- `README.md` with project overview, command reference, and OpenClaw JSON output spec.
- `tsconfig.json` with strict TypeScript configuration and `@/*` path aliases.
- `package.json` with all runtime and dev dependencies.
