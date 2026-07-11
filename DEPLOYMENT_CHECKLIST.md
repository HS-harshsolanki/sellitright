# ChapterNew Deployment Checklist

> Use this checklist before every staging deployment and before the final production launch.
> Mark each item as you complete it. Do not proceed to the next section if a blocker remains unresolved.

---

## Pre-Deploy: Environment Variables

Verify every secret is set in Fly.io before deploying:

```bash
fly secrets list --app chapternew-staging
```

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — set and points to the correct Supabase project
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — set (safe to expose; read-only anon key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — set (keep secret; bypasses RLS)
- [ ] `NEXT_PUBLIC_APP_URL` — set to `https://staging.chapternew.com`
- [ ] `ADMIN_SECRET_KEY` — set to a strong random string (`openssl rand -hex 32`), NOT `dev-admin-secret`
- [ ] `ADMIN_SESSION_SECRET` — set (signs admin httpOnly cookie; `openssl rand -hex 32`)
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_ID` — set to test key (`rzp_test_...`) for staging, live key for production
- [ ] `RAZORPAY_KEY_ID` — set to same value as `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- [ ] `RAZORPAY_KEY_SECRET` — set (Razorpay dashboard → Settings → API Keys)
- [ ] `RAZORPAY_WEBHOOK_SECRET` — set (must match value entered in Razorpay webhook config)
- [ ] `MSG91_AUTH_KEY` — set (or intentionally blank to fall back to console OTP logging)
- [ ] `MSG91_TEMPLATE_ID` — set (required if `MSG91_AUTH_KEY` is set)
- [ ] `OTP_HMAC_SECRET` — set to a strong random string (`openssl rand -hex 32`), NOT `dev-otp-secret`

**Verification command:**

```bash
fly secrets list --app chapternew-staging
# Every key above should appear in the output (values are hidden — that is expected)
```

---

## Pre-Deploy: Database

### Migrations

Run migrations **in order**. For a fresh database use the single idempotent script; for an existing database apply only the incremental files that have not yet been applied.

**Fresh database (recommended for staging):**

- [ ] `000_complete_idempotent_schema.sql` — run this once for a fresh DB

**Incremental (existing database — apply only unapplied files in order):**

- [ ] `001_listings.sql`
- [ ] `002_admin.sql`
- [ ] `003_rls_fixes.sql`
- [ ] `004_buyer_interest.sql`
- [ ] `005_payments.sql`
- [ ] `006_indexes.sql`
- [ ] `007_rls_contact_protection.sql`
- [ ] `008_notifications.sql`
- [ ] `009_payments_listing_fk.sql`
- [ ] `010_schema_fixes.sql` — before running, verify: `SELECT * FROM reports WHERE target_listing_id !~ '^[0-9a-f-]{36}$'` returns 0 rows
- [ ] `011_search_and_perf_indexes.sql`
- [ ] `012_security_hardening.sql` — adds RLS deny policies, canonical policy names, `buyer_interest_safe` view
- [ ] `013_audit_log_actions.sql`

### Post-Migration Verification

- [ ] Seed data loaded (staging only — do not seed production)
- [ ] RLS policies active on all tables

```sql
-- Verify RLS is enabled on every table that holds user data
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- rowsecurity should be TRUE for: listings, buyer_interests, payments, notifications,
-- activity_logs, reports, profiles (or equivalent user table)
```

- [ ] Confirm all public tables are visible:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Storage

- [ ] `photos` bucket created in Supabase Dashboard → Storage
- [ ] `photos` bucket is set to **Public**

---

## Pre-Deploy: Authentication

- [ ] `NEXT_PUBLIC_SUPABASE_URL` points to the correct project (staging vs production)
- [ ] Google OAuth provider enabled in Supabase Dashboard → Authentication → Providers
- [ ] OAuth redirect URL registered in Supabase Dashboard → Authentication → URL Configuration:
  - Staging: `https://staging.chapternew.com/auth/callback`
  - Production: `https://chapternew.com/auth/callback` (add before production launch)
- [ ] Email magic link enabled (Supabase Dashboard → Authentication → Providers → Email)
- [ ] Rate limiting configured (Supabase Dashboard → Authentication → Rate Limits — review defaults)

---

## Pre-Deploy: External Services

### Razorpay

- [ ] **Staging:** Test mode keys used (`rzp_test_...`)
- [ ] **Production:** Live mode keys used (`rzp_live_...`)
- [ ] Webhook registered in Razorpay Dashboard → Settings → Webhooks:
  - URL: `https://staging.chapternew.com/api/payments/webhook`
  - Events: `payment.captured`, `order.paid`
  - Secret matches `RAZORPAY_WEBHOOK_SECRET` secret in Fly.io
- [ ] Webhook delivery confirmed (test via Razorpay dashboard → Webhooks → Test)

### MSG91 SMS

- [ ] `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` set in Fly.io secrets
- [ ] If MSG91 is not yet configured: confirm console OTP fallback is acceptable for staging (leave both env vars blank)
- [ ] OTP template approved in MSG91 dashboard (required for production)

### Firebase Phone Auth (if using `/api/auth/firebase-verify` flow)

- [ ] Firebase project created and `firebaseConfig` values available
- [ ] Phone auth enabled in Firebase console → Authentication → Sign-in method
- [ ] Relevant Firebase env vars set (check `apps/web/src/lib/firebase/`)

---

## Pre-Deploy: Application

Run these locally against the current commit before pushing:

- [ ] TypeScript passes: `pnpm --filter web typecheck`
- [ ] Unit tests pass: `pnpm --filter web test`
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] No `console.error` calls that should have been removed (search: `grep -r "console.error" apps/web/src/app`)

---

## Pre-Deploy: Infrastructure (Fly.io)

- [ ] App exists: `fly apps list` shows `chapternew-staging`
- [ ] All secrets set: `fly secrets list --app chapternew-staging` (all 13 keys visible)
- [ ] `fly.toml` has `min_machines_running = 1` (prevents cold starts for first users)
- [ ] SSL/HTTPS active — `force_https = true` is set in `fly.toml` `[http_service]`
- [ ] Health check endpoint responds after deploy:

```bash
curl -sf https://staging.chapternew.com/api/health
# Expected: {"status":"ok", ...}
# HTTP 503 means DB unreachable or service client missing
```

- [ ] `fly status --app chapternew-staging` shows machine in `started` state

---

## Pre-Deploy: Security

- [ ] `robots.txt` blocks all crawlers on staging (confirm `Disallow: /` in `apps/web/public/robots.txt` or via meta tag)
- [ ] `ADMIN_SECRET_KEY` is a strong random string — **NOT** the default `dev-admin-secret`
- [ ] `ADMIN_SESSION_SECRET` is set (not blank)
- [ ] `OTP_HMAC_SECRET` is set (not blank — blank falls back to insecure `dev-otp-secret`)
- [ ] HSTS header active — verify:

```bash
curl -sI https://staging.chapternew.com | grep -i strict-transport
# Expected: strict-transport-security: max-age=...
```

- [ ] CSP header active — verify:

```bash
curl -sI https://staging.chapternew.com | grep -i content-security-policy
```

- [ ] Beta access code set (if gating access to staging behind a code)

---

## Post-Deploy: Smoke Tests

Run these immediately after a successful deploy. All should return HTTP 2xx.

```bash
BASE="https://staging.chapternew.com"

# Health
curl -sf "$BASE/api/health" | jq .

# Listings list (public)
curl -sf "$BASE/api/listings" | jq 'length'

# Auth callback reachable (expect redirect, not 500)
curl -sI "$BASE/auth/callback" | head -3

# Payment order creation (expects 400/401 without body — confirms route is live)
curl -sI -X POST "$BASE/api/payments/create-order" | head -3

# Payment verify (expects 400/401 without body)
curl -sI -X POST "$BASE/api/payments/verify" | head -3

# Admin panel (expects 401 without valid session)
curl -sI "$BASE/admin" | head -3

# Webhook endpoint (expects 400 without valid payload)
curl -sI -X POST "$BASE/api/payments/webhook" | head -3

# Notifications list (expects 401 without session)
curl -sI "$BASE/api/notifications" | head -3
```

---

## Post-Deploy: Manual Verification

Walk through each user journey manually in a browser after deploy:

- [ ] **Google OAuth login flow** — click "Continue with Google", complete consent, land on dashboard
- [ ] **Phone OTP flow** — enter phone number, receive SMS (or check console if MSG91 not set), enter OTP, verify succeeds
- [ ] **Razorpay test payment** — use test card `4111 1111 1111 1111`, expiry any future date, any CVV
  - Confirm order created, payment captured, contact unlocked
- [ ] **Post a listing end-to-end** — fill form, upload photo, submit, confirm listing appears in search
- [ ] **Express interest as buyer** — browse to a listing, click "Express Interest", confirm interest recorded
- [ ] **Accept interest as seller** — log in as seller, open buyer interest notification, accept
- [ ] **Contact revealed after payment** — buyer pays ₹1 (test), confirm seller contact details are now visible
- [ ] **Admin panel access** — navigate to `/admin`, authenticate with `ADMIN_SECRET_KEY`, confirm listings table loads

---

## Launch Gates (PASS / FAIL / MANUAL)

The following table must be fully green before going live. "MANUAL" means the item requires a human decision or external dependency, not an automated check.

| #   | Gate                                                                   | Status | Notes                                                                        |
| --- | ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| 1   | All 13 DB migrations applied (or `000_complete_idempotent_schema.sql`) | FAIL   | Run in Supabase SQL Editor                                                   |
| 2   | RLS enabled on all user-data tables                                    | FAIL   | Verify via `pg_tables` query                                                 |
| 3   | `photos` storage bucket created and public                             | FAIL   | Supabase Dashboard → Storage                                                 |
| 4   | All 13 Fly.io secrets set                                              | FAIL   | `fly secrets list`                                                           |
| 5   | `ADMIN_SECRET_KEY` is not `dev-admin-secret`                           | FAIL   | Security requirement                                                         |
| 6   | `OTP_HMAC_SECRET` is not blank                                         | FAIL   | Security requirement                                                         |
| 7   | `ADMIN_SESSION_SECRET` is not blank                                    | FAIL   | Security requirement                                                         |
| 8   | Google OAuth redirect URL registered in Supabase                       | FAIL   | Auth requirement                                                             |
| 9   | Razorpay webhook registered and verified                               | FAIL   | Payment requirement                                                          |
| 10  | TypeScript build passes with no errors                                 | FAIL   | `pnpm --filter web typecheck`                                                |
| 11  | Unit tests pass                                                        | FAIL   | `pnpm --filter web test`                                                     |
| 12  | Production build succeeds                                              | FAIL   | `pnpm --filter web build`                                                    |
| 13  | Health check returns `{"status":"ok"}`                                 | FAIL   | `curl /api/health`                                                           |
| 14  | `min_machines_running = 1` in `fly.toml`                               | FAIL   | No cold starts                                                               |
| 15  | SSL/HTTPS enforced (`force_https = true`)                              | PASS   | Already in `fly.toml`                                                        |
| 16  | HSTS header present                                                    | FAIL   | Verify post-deploy                                                           |
| 17  | CSP header present                                                     | FAIL   | Verify post-deploy                                                           |
| 18  | `robots.txt` blocks crawlers (staging)                                 | MANUAL | Not needed for production                                                    |
| 19  | Google OAuth login flow works end-to-end                               | FAIL   | Manual browser test                                                          |
| 20  | Phone OTP flow works end-to-end                                        | FAIL   | Manual browser test                                                          |
| 21  | Razorpay test payment completes (contact revealed)                     | FAIL   | Manual browser test                                                          |
| 22  | Listing create → search → interest → accept flow works                 | FAIL   | Manual browser test                                                          |
| 23  | Admin panel accessible and functional                                  | FAIL   | Manual browser test                                                          |
| 24  | Razorpay keys switched to live (production only)                       | MANUAL | Do not use test keys in production                                           |
| 25  | MSG91 OTP template approved (production only)                          | MANUAL | Required for live SMS delivery                                               |
| 26  | Uptime monitor configured for `/api/health`                            | MANUAL | UptimeRobot / Better Uptime                                                  |
| 27  | Error monitoring (Sentry or equivalent) active                         | MANUAL | See MONITORING_SETUP.md                                                      |
| 28  | GitHub Actions secrets set for CI/CD                                   | FAIL   | `FLY_API_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
