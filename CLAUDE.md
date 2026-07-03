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

| Path                       | Description                              |
| -------------------------- | ---------------------------------------- |
| `apps/web`                 | Next.js 14 App Router frontend           |
| `infrastructure/supabase/` | SQL migrations (run in order: 001 → 00N) |
| `packages/`                | Shared packages (types, config, etc.)    |

## Stack

- Next.js 14 App Router + TypeScript
- Supabase (Auth, Postgres, Storage)
- Tailwind CSS + shadcn/ui
- Playwright (E2E) + Vitest (unit)
- pnpm workspaces + Turborepo

## Environment

Copy `.env.example` → `.env.local` and fill in Supabase credentials.
Without a `.env.local`, the app falls back to mock data automatically.

## Quality gate — REQUIRED before every commit/push

**Never commit or push without running the quality gate first.**

```bash
pnpm check          # full gate: lint + typecheck + unit + build + E2E
pnpm check:fast     # skip E2E — use during active development
pnpm check:fix      # auto-fix lint/format, then run full gate
```

The gate prints a summary table showing Pass/Fail/Skip per check with duration.
If any check fails, the output includes the full failure details and exits 1.

### What runs where

| Check                  | Local pre-commit | Local pre-push | CI (GitHub Actions)           |
| ---------------------- | ---------------- | -------------- | ----------------------------- |
| Lint + format (staged) | ✓                |                |                               |
| TypeScript             |                  | ✓              | ✓                             |
| Unit tests             |                  | ✓              | ✓                             |
| Production build       |                  |                | ✓                             |
| E2E tests              |                  |                | ✓                             |
| Auto-deploy to Fly.io  |                  |                | ✓ (main only, after all pass) |

### Commit message format

Uses [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Examples:
feat(listing): add buyer interest handshake
fix(api): correct enum values in contact route
docs(ci): update quality gate instructions
test(e2e): add sell flow spec
```

Valid types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`, `build`
Valid scopes: `web`, `api`, `auth`, `admin`, `sell`, `browse`, `dashboard`, `listing`, `infra`, `db`, `ci`, `deps`, `config`, `e2e`, `test`, `docs`

---

## Key commands

```bash
pnpm --filter web dev          # start dev server (default port 3000)
pnpm --filter web typecheck    # TypeScript check
pnpm --filter web build        # production build
pnpm --filter web test         # unit tests
pnpm --filter web test:e2e     # Playwright E2E (needs server running or uses webServer config)
pnpm check                     # full quality gate with summary
```

## GitHub Actions secrets required

Set these in GitHub repo Settings → Secrets → Actions:

| Secret                          | Description                           |
| ------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service-role key             |
| `FLY_API_TOKEN`                 | Fly.io deploy token (for auto-deploy) |

## Validators

Enum values live in `apps/web/src/lib/validators.ts`. Always use these values in
E2E tests and API calls — do not invent new enum strings.

## E2E report

After running E2E tests locally: open `apps/web/playwright-report/index.html`.
In CI: download the `playwright-report` artifact from the GitHub Actions run.
