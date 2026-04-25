# Contributing to WhatsCLI

Thank you for your interest in contributing! WhatsCLI is a TypeScript/Node.js CLI for WhatsApp Web automation powered by [Baileys](https://github.com/WhiskeySockets/Baileys).

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20.x |
| npm | >= 9.x |
| A WhatsApp account | for integration testing |

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/thiagobarbosa-dev/whatscli
cd whatscli

# 2. Install dependencies
npm install

# 3. Run in dev mode
npx ts-node src/index.ts --help

# 4. Authenticate with your WhatsApp account
npx ts-node src/index.ts auth

# 5. Run a test sync
npx ts-node src/index.ts sync --once
```

---

## Project Structure

```
src/
  auth/           # QR login and session state management
  commands/       # CLI command definitions (one file per command group)
  services/       # Baileys API wrappers and business logic
  store/          # SQLite persistence (db.ts, migrations, stores)
  output/         # TTY table / NDJSON formatter
  utils/          # logger, jid normalization
  index.ts        # CLI entrypoint — registers all commands
```

---

## Development Workflow

### Adding a new command

1. Create `src/commands/your-command.ts` — export a `Command` instance.
2. Register it in `src/index.ts` with `program.addCommand(yourCommand)`.
3. If it needs data persistence, add a store in `src/store/` and a migration in `src/store/db.ts`.
4. Update the commands table in `README.md`.
5. Add an entry to `CHANGELOG.md` under `[Unreleased]`.

### Building

```bash
npm run build      # compiles TypeScript to dist/
npm run lint       # runs ESLint
npx tsc --noEmit   # type-check only (no output)
```

---

## Code Style

- **TypeScript strict mode** — no `any` unless unavoidable (document why).
- **Conventional Commits** for commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- All logs go to **`stderr`** via pino. `stdout` is reserved exclusively for data output (NDJSON).
- Use `outputList` / `outputRecord` from `src/output/formatter.ts` — never `console.log` raw data.
- Always call `process.exit(0)` explicitly after async commands that open a Baileys connection.

---

## Sending Messages in Tests

> [!WARNING]
> Never hardcode real phone numbers in tests or example files. Use placeholder JIDs like `5500000000000@s.whatsapp.net`.

The `--read-only` flag is your friend: `whatscli send text --to ... --read-only` will block the send and exit with code 1, allowing you to test the argument parsing path without actually sending anything.

---

## Submitting a Pull Request

1. Fork the repo and create your branch from `main`: `git checkout -b feat/my-feature`
2. Make your changes and ensure `npx tsc --noEmit` passes with **zero errors**.
3. Update `CHANGELOG.md` under `## [Unreleased]` describing what changed.
4. Open a PR against `main` with a clear description of the problem and solution.

---

## Reporting Bugs

Please open a [GitHub Issue](https://github.com/thiagobarbosa-dev/whatscli/issues) and include:
- Your OS and Node.js version (`node --version`)
- The exact command you ran
- The full output (stderr included)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
