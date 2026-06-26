# sellitright — Claude Code Instructions

## Worktree policy (REQUIRED)

This project is worked on across multiple concurrent Claude Code sessions.
**Every session MUST use a git worktree** to avoid file conflicts, corrupted lockfiles,
and stale git state.

### Starting a new session

Before doing any work, check if you are already in a worktree:

```bash
git worktree list
```

If you are in the main working tree (`/Users/harshsolanki/sellitright`), create a worktree:

```bash
# Replace <branch-name> with the feature you are working on
git worktree add .claude/worktrees/<branch-name> -b <branch-name>
```

Then use the `EnterWorktree` tool (or `cd .claude/worktrees/<branch-name>`) to switch into it.

### Rules

- **Never edit files in the main working tree directly** when another session may be active.
- **One session per worktree** — do not share a worktree between two Claude sessions.
- **Commit your work before leaving a worktree.** Uncommitted changes in a worktree are invisible to other sessions.
- **pnpm commands** — always run `pnpm install` inside the worktree directory, not from the root, to avoid lockfile races.
- **Dev server** — each worktree must use a different port. Pass `PORT=3001` (or similar) when running `pnpm dev` to avoid port conflicts with the main session.

### Cleaning up

When done with a worktree:

```bash
# from the main repo root
git worktree remove .claude/worktrees/<branch-name>
```

---

## Project overview

**Monorepo** — pnpm workspaces, Turborepo.

| Path | Description |
|---|---|
| `apps/web` | Next.js 14 App Router frontend |
| `infrastructure/supabase/` | SQL migrations (run in order: 001 → 00N) |
| `packages/` | Shared packages (types, config, etc.) |

## Stack

- Next.js 14 App Router + TypeScript
- Supabase (Auth, Postgres, Storage)
- Tailwind CSS + shadcn/ui
- Playwright (E2E) + Vitest (unit)
- pnpm workspaces + Turborepo

## Environment

Copy `.env.example` → `.env.local` and fill in Supabase credentials.
Without a `.env.local`, the app falls back to mock data automatically.

## Key commands

```bash
pnpm --filter web dev          # start dev server (default port 3000)
pnpm --filter web typecheck    # TypeScript check
pnpm --filter web build        # production build
pnpm --filter web test:e2e     # Playwright E2E
```

## Validators

Enum values live in `apps/web/src/lib/validators.ts`. Always use these values in
E2E tests and API calls — do not invent new enum strings.
