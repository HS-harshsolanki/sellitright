# ChapterNew (sellitright) — Claude Code Instructions

## ⚠️ STOP — Read this section before touching anything

### `main` → production. Every push deploys to chapternew.com.

`.github/workflows/deploy.yml` auto-deploys to Fly.io on every push to `main` that passes CI.
**A bad commit on `main` = broken production = real users affected immediately.**

#### Hard rules — no exceptions

1. **Never `git push origin main`** under any circumstances.
2. **Never commit directly to local `main`** — always work on a feature branch.
3. **Never merge your own PR** — open it and stop. The user merges.
4. **Never deploy to production** unless the user says the exact words "deploy to production" or "push to main". Staging (Vercel) is separate and safe.
5. **If local `main` is ahead of `origin/main`**, stop immediately, do not push, tell the user which commits are unpushed and ask how to handle it.

---

## Branch workflow — mandatory for every agent

### Before starting work

```bash
git fetch origin
git log --oneline origin/main..HEAD   # must show nothing — if not, stop and tell the user
git checkout -b <type>/<description> origin/main
```

Branch naming prefixes:

- `fix/` bug fixes
- `feat/` new features
- `chore/` config, deps, CI, docs
- `refactor/` code restructure with no behaviour change

Examples: `fix/phone-filter-emoji`, `feat/contact-reveal-ui`, `chore/update-flytoml`

**Never branch off another agent's branch** unless the user explicitly says to build on top of it.

### Commit on your branch, open a PR, stop

```bash
git push origin <your-branch>
gh pr create --base main --title "..." --body "..."
# STOP HERE — do not merge, do not push main
```

---

## Multiple agents working in parallel

- Each agent works on its **own branch** — never share a branch between two agents.
- If two agents touch the same file, that is a merge conflict waiting to happen. Ask the user to coordinate before starting.
- If you see that local `main` has unpushed commits from a previous agent session, tell the user before doing anything — don't rebase, don't push, just report.

---

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
git worktree add .claude/worktrees/<branch-name> -b <branch-name> origin/main
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
