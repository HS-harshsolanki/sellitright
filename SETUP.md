# SellItRight — Setup & Deploy Guide

> Last updated: 2026-06-29. All sections verified against the current codebase.

---

## Local Development

### 1. Clone and install

```sh
git clone https://github.com/HS-harshsolanki/sellitright.git
cd sellitright
pnpm install
```

### 2. Environment

```sh
cp .env.example .env.local
```

Fill in the values (see `.env.example` for all keys):

| Key                             | Where to get it                                             |
| ------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase dashboard → Project Settings → API                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase dashboard → Project Settings → API (service_role)  |
| `NEXT_PUBLIC_APP_URL`           | `http://localhost:3000` for local                           |
| `ADMIN_SECRET_KEY`              | Any strong random string (e.g. `openssl rand -hex 32`)      |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`   | Razorpay dashboard → Settings → API Keys (test key for dev) |
| `RAZORPAY_KEY_ID`               | Same value as `NEXT_PUBLIC_RAZORPAY_KEY_ID`                 |
| `RAZORPAY_KEY_SECRET`           | Razorpay dashboard → Settings → API Keys                    |
| `RAZORPAY_WEBHOOK_SECRET`       | Set when configuring Razorpay webhook (see below)           |

### 3. Database migrations — fresh project

Run each file **in order** in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run):

```
infrastructure/supabase/000_complete_idempotent_schema.sql  ← run this for a fresh DB
```

OR for incremental updates on an existing DB, run in order:

```
001_listings.sql
002_admin.sql
003_rls_fixes.sql
004_buyer_interest.sql
005_payments.sql
006_indexes.sql
007_rls_contact_protection.sql
008_notifications.sql
009_payments_listing_fk.sql
010_schema_fixes.sql
011_search_and_perf_indexes.sql
012_security_hardening.sql      ← adds RLS deny policies, canonical policy names, buyer_interest_safe view
```

> **Note on `010_schema_fixes.sql`**: The USING cast (`target_listing_id::uuid`) will fail if any non-UUID strings exist in that column. Verify with `SELECT * FROM reports WHERE target_listing_id !~ '^[0-9a-f-]{36}$'` first.

### 4. Supabase Storage

In Supabase Dashboard → Storage:

- Create bucket named `photos`
- Set bucket to **Public**

### 5. Auth providers

In Supabase Dashboard → Authentication → Providers:

- Enable **Google**
- Set Authorized redirect URI: `http://localhost:3000/auth/callback` (for local), `https://sellitright.fly.dev/auth/callback` (for production)

### 6. Run

```sh
pnpm dev
```

App runs at `http://localhost:3000`.

---

## Production Deploy (Fly.io)

### Prerequisites

- `flyctl` installed: `brew install flyctl` or `curl -L https://fly.io/install.sh | sh`
- Logged in: `flyctl auth login`
- App created: `flyctl apps create sellitright` (skip if already exists)

### Step 1 — Set Fly.io secrets

Run once (or re-run to update any value):

```sh
flyctl secrets set \
  NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  NEXT_PUBLIC_APP_URL="https://sellitright.fly.dev" \
  ADMIN_SECRET_KEY="$(openssl rand -hex 32)" \
  NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_live_XXXXXXXXXXXXXXXX" \
  RAZORPAY_KEY_ID="rzp_live_XXXXXXXXXXXXXXXX" \
  RAZORPAY_KEY_SECRET="your_razorpay_key_secret" \
  RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"
```

> `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_ID` must be identical — the client reads the `NEXT_PUBLIC_` variant directly; the server uses `RAZORPAY_KEY_ID`.

### Step 2 — Set GitHub Actions secrets

In GitHub → repo → Settings → Secrets and variables → Actions, add:

| Secret                          | Value                    |
| ------------------------------- | ------------------------ |
| `FLY_API_TOKEN`                 | From `flyctl auth token` |
| `NEXT_PUBLIC_SUPABASE_URL`      | Same as Fly.io           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as Fly.io           |

(The deploy workflow passes `NEXT_PUBLIC_*` values as Docker build-args at build time so Next.js can inline them.)

### Step 3 — Apply latest SQL migrations to production Supabase

In Supabase SQL Editor, run:

```sql
-- Apply 012_security_hardening.sql
-- (paste contents of infrastructure/supabase/012_security_hardening.sql)
```

This adds:

- `enable row level security` on `payments`, `notifications`, `activity_logs`, `reports`
- Canonical RLS policy names (drops old duplicates)
- `buyer_interest_safe` view (hides seller contact until unlocked)
- INSERT/UPDATE/DELETE deny policies on `payments` and `notifications`

### Step 4 — Deploy

**Manual deploy:**

```sh
flyctl deploy --remote-only \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$(flyctl secrets list | grep NEXT_PUBLIC_SUPABASE_URL)" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  --build-arg NEXT_PUBLIC_APP_URL="https://sellitright.fly.dev"
```

**Automatic deploy (CI/CD):** Merge PR into `main` → CI passes → deploy workflow triggers automatically.

### Step 5 — Configure Razorpay webhook

In Razorpay Dashboard → Settings → Webhooks → Add new webhook:

- **URL**: `https://sellitright.fly.dev/api/payments/webhook`
- **Secret**: (same value as `RAZORPAY_WEBHOOK_SECRET` secret)
- **Events**: `payment.captured`, `order.paid`

### Step 6 — Configure Google OAuth callback

In Supabase Dashboard → Authentication → URL Configuration:

- Add to Redirect URLs: `https://sellitright.fly.dev/auth/callback`

---

## Pre-launch Checklist

### Database

- [ ] `000_complete_idempotent_schema.sql` run on production (fresh DB) OR all 12 incremental migrations in order
- [ ] `012_security_hardening.sql` applied (RLS hardening)
- [ ] `photos` bucket created and set to Public in Supabase Storage

### Fly.io

- [ ] All secrets set via `flyctl secrets set` (9 secrets above)
- [ ] `flyctl status` shows app running, health check passing (`/api/health`)
- [ ] `fly.toml` has `min_machines_running = 1` (no cold start for users)

### GitHub Actions

- [ ] `FLY_API_TOKEN` secret set
- [ ] `NEXT_PUBLIC_SUPABASE_URL` secret set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` secret set

### Payments

- [ ] Razorpay live keys used (not test keys) in production secrets
- [ ] Razorpay webhook URL configured and verified (check webhook logs in Razorpay dashboard)
- [ ] Webhook secret matches `RAZORPAY_WEBHOOK_SECRET`

### Auth

- [ ] Google OAuth redirect URL added in Supabase: `https://sellitright.fly.dev/auth/callback`

### Smoke tests (post-deploy)

- [ ] Browse listings at `https://sellitright.fly.dev/properties`
- [ ] Register/login with Google
- [ ] Create a test listing (seller flow)
- [ ] Submit interest as a different user (buyer flow)
- [ ] Accept interest as seller
- [ ] Complete ₹49 payment unlock (use Razorpay test card in staging)
- [ ] Confirm seller contact details revealed to buyer
- [ ] Admin panel accessible at `/admin`

---

## Production Monitoring

### Health endpoint

The app exposes `GET /api/health` returning `{ status: "ok"|"degraded"|"down", checks: {...} }`.

- HTTP 200 = healthy
- HTTP 503 = database unreachable or service client missing

Set up a free uptime monitor at https://uptimerobot.com pointing to:
`https://your-domain.com/api/health`
Alert on non-200 responses.

### Analytics

Vercel Analytics and Speed Insights are enabled automatically on Vercel deployments.
No configuration needed.

### Log drains (optional)

To persist logs beyond Vercel's 1-day retention, configure a Log Drain in the Vercel
dashboard (Settings → Log Drains) pointing to BetterStack or Axiom (both have free tiers).
Logs are emitted as structured JSON.

---

## Useful commands

```sh
# View live logs
flyctl logs

# SSH into running machine
flyctl ssh console

# Check app status
flyctl status

# Scale memory (if OOM)
flyctl scale memory 2048

# List secrets (keys only, values hidden)
flyctl secrets list

# Update a single secret
flyctl secrets set KEY="new-value"
```

---

## Architecture summary

```
Browser → Next.js App Router (Fly.io, 1 GB RAM)
              ↓
         Supabase (Postgres + Auth + Storage + Realtime)
              ↓
         Razorpay (payments webhook → /api/payments/webhook)
```

Key endpoints:

- `POST /api/listings/create` — seller creates listing
- `POST /api/buyer-interest` — buyer submits interest
- `POST /api/payments/create-order` — create Razorpay order for ₹49 unlock
- `POST /api/payments/verify` — HMAC-verify + unlock contact
- `GET  /api/payments/status?interestId=` — check unlock status (already-paid recovery)
- `POST /api/payments/webhook` — Razorpay server-to-server notification
- `GET  /api/health` — Fly.io health check
