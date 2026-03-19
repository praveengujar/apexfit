# Workforce

Control plane for managing autonomous Claude Code agent sessions.

## Modes

### Plugin mode (primary)
```bash
claude --plugin-dir ./workforce   # Load as Claude Code plugin
```

### Legacy webapp mode
```bash
npm run dev          # Start Vite dev server (port 3739)
npm run server       # Start backend (port 3740)
npm test             # vitest run (all tests)
npm run test:watch   # vitest in watch mode
npm run verify-routes  # Route verifier — catches frontend API calls with no matching backend route
```

## Stack

- **Plugin:** MCP server (stdio) + skills + agents + hooks
- **Legacy Frontend:** React 18 + Vite (localhost:3739)
- **Legacy Backend:** Node.js + Express 5 (localhost:3740)
- **Database:** SQLite via `node:sqlite` (DatabaseSync), stored at `~/.claude/tasks/workforce.db`
- **Tests:** Vitest + jsdom + React Testing Library

## Architecture

- `workforce/` — Claude Code plugin: MCP server, skills, agents, hooks
- `server/` — Legacy Express backend: task lifecycle, cost model, recovery engine, SQLite DB
- `src/` — Legacy React frontend: App.jsx, tab components
- `scripts/verify-routes.cjs` — pre-commit route integrity check

## Task lifecycle

Each task spawns Claude CLI as a child process in an isolated git worktree (`wf/{id}` branch, temp dir).

Phases: `queued → preparing → running → verifying → merging → done/failed`

- Auto-merge to main on success; auto-cleanup worktree on failure
- Up to 10 concurrent tasks (hard cap)
- Watchdog kills any task running > 10 min
- Zero-work guard: if Claude made no real code changes, task is marked `failed`, not `done`

## Git conventions

- Per-repo merge lock serializes the merge step — concurrent tasks queue rather than race
- `git merge --autostash --no-ff` to prevent cascade when main has uncommitted changes
- Worktree retry loop: 3 attempts at 600ms×n backoff
- `git worktree prune` on server startup before orphan cleanup

## Rules

- Run `npm run verify-routes` before committing API changes
- Never overwrite non-empty queue with empty array on JSON parse failure
- Cross-platform code only — no hardcoded paths or usernames
- Credentials in env vars, never in code
