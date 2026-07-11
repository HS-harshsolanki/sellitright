# ChapterNew Monitoring Setup

> This document covers all observability layers for the staging beta and production:
> error monitoring, structured logging, uptime monitoring, analytics, and incident response.

---

## Error Monitoring: Sentry (Recommended for Staging)

### Why Sentry

- Free tier: 5,000 errors/month — sufficient for a beta
- Next.js SDK has automatic error capture for API routes and React rendering
- Source maps upload at build time → readable stack traces (not minified)
- Performance monitoring (Web Vitals, API response times) included in the free tier

### Setup Steps

1. Create a free account at [sentry.io](https://sentry.io)
2. Create a new project, select **Next.js**
3. Install the SDK:
   ```bash
   pnpm --filter web add @sentry/nextjs
   ```
4. Run the interactive wizard (it edits `next.config.js` and creates `sentry.*.config.ts` files):
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```
5. Add the following secrets to Fly.io for both staging and production:
   ```bash
   fly secrets set \
     SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx" \
     NEXT_PUBLIC_SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx" \
     SENTRY_ORG="your-org" \
     SENTRY_PROJECT="chapternew" \
     SENTRY_AUTH_TOKEN="your-token" \
     --app chapternew-staging
   ```
   - `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` must be the same value (server and browser both need it)
   - `SENTRY_AUTH_TOKEN` is required only for source map uploads during `pnpm build`
6. Tag events by environment so staging errors are filtered from production noise:
   ```ts
   // sentry.server.config.ts / sentry.client.config.ts
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment:
       process.env.NODE_ENV === 'production'
         ? process.env.NEXT_PUBLIC_APP_URL?.includes('staging')
           ? 'staging'
           : 'production'
         : 'development',
   })
   ```

### What Gets Captured Automatically

- Unhandled exceptions in all API routes (`/api/**`)
- React component crashes (via the auto-injected error boundary)
- Performance traces: API response times, Web Vitals (LCP, CLS, FID)
- Database query durations (if `@sentry/nextjs` instrumentation is enabled)

### What to Alert On

Configure alerts in Sentry → Alerts → Create Alert Rule:

| Alert           | Condition                                    | Action            |
| --------------- | -------------------------------------------- | ----------------- |
| High error rate | Error rate > 5 errors/minute                 | Email + Slack     |
| Slow API        | P95 latency > 2 000 ms                       | Email             |
| Payment error   | Any event with tag `route = /api/payments/*` | Email immediately |
| Auth error      | Any event with tag `route = /api/auth/*`     | Email             |

---

## Structured Logging: Fly.io + logger.ts

The app uses `apps/web/src/lib/logger.ts` — a thin wrapper around `console.log/warn/error`
that outputs every log entry as a single JSON line to stdout:

```json
{"level":"info","msg":"payment verified","ts":"2026-07-11T09:00:00.000Z","interestId":"abc123"}
{"level":"error","msg":"razorpay signature mismatch","ts":"2026-07-11T09:00:01.000Z"}
```

Fly.io captures all stdout from the running container. View logs in real time:

```bash
# Stream all logs
fly logs --app chapternew-staging

# Filter to errors only
fly logs --app chapternew-staging | grep '"level":"error"'

# Filter to payment-related entries
fly logs --app chapternew-staging | grep 'payment'

# Filter to auth-related entries
fly logs --app chapternew-staging | grep 'auth\|otp\|phone'

# Pretty-print with jq (if installed)
fly logs --app chapternew-staging | grep '^{' | jq .
```

**Note:** Fly.io retains logs for approximately 7 days. For longer retention, configure a
log drain (Fly.io dashboard → App → Monitoring → Log Drains) pointing to BetterStack or Axiom
(both have free tiers). Logs are already in JSON format so no transformation is needed.

---

## Uptime Monitoring: Better Uptime or UptimeRobot

The app exposes `GET /api/health` which returns:

- HTTP `200` with `{"status":"ok","checks":{...}}` when healthy
- HTTP `503` with `{"status":"degraded"|"down",...}` when the database is unreachable
  or a required service client (Supabase, Razorpay) cannot initialise

### Setup (Free Tier — UptimeRobot)

1. Create a free account at [uptimerobot.com](https://uptimerobot.com)
   (Alternative: [betteruptime.com](https://betteruptime.com) — better UI, also free)
2. Add a new HTTP(s) monitor:
   - URL: `https://staging.chapternew.com/api/health`
   - Check interval: **5 minutes**
   - Expected HTTP status: `200`
   - Keyword check (optional): `"status":"ok"`
3. Configure alerts:
   - Email notification on first failure
   - Email notification on recovery
   - Slack/Discord webhook (optional)
4. Repeat for production: `https://chapternew.com/api/health`

### Uptime Target

| Environment  | Target SLA                            |
| ------------ | ------------------------------------- |
| Staging beta | 99% (allows ~7 h downtime/month)      |
| Production   | 99.9% (allows ~44 min downtime/month) |

---

## Analytics: PostHog (Recommended Addition — Not Yet Integrated)

The codebase currently uses **Vercel Analytics** (`@vercel/analytics` is installed) for
basic page view tracking. For behavioural funnel analysis during the beta,
**PostHog** is the recommended addition.

### Setup Steps

1. Create a free account at [posthog.com](https://posthog.com)
2. Create a new project named `ChapterNew`
3. Install the SDK:
   ```bash
   pnpm --filter web add posthog-js posthog-node
   ```
4. Add secrets to Fly.io:
   ```bash
   fly secrets set \
     NEXT_PUBLIC_POSTHOG_KEY="phc_xxxxxxxxxxxx" \
     NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com" \
     --app chapternew-staging
   ```
5. Create `apps/web/src/lib/analytics.ts` and initialise PostHog in the root layout.

### Recommended Events to Instrument

Add these calls to their respective API routes and client components once PostHog is wired in:

| Event Name               | Where to fire                        | Key Properties                |
| ------------------------ | ------------------------------------ | ----------------------------- |
| `page_viewed`            | Root layout / middleware             | `path`, `referrer`            |
| `signup_started`         | Auth page load                       | `method: 'google' \| 'phone'` |
| `signup_completed`       | `/api/auth/callback` success         | `method`                      |
| `phone_otp_requested`    | `/api/auth/send-otp` success         | —                             |
| `phone_otp_verified`     | `/api/auth/verify-otp` success       | —                             |
| `listing_create_started` | Listing form page load               | —                             |
| `listing_published`      | `/api/listings/create` success       | `listing_id`, `category`      |
| `listing_viewed`         | Listing detail page load             | `listing_id`, `category`      |
| `interest_expressed`     | `/api/buyer-interest` success        | `listing_id`                  |
| `interest_accepted`      | Seller accepts interest              | `listing_id`, `interest_id`   |
| `payment_initiated`      | `/api/payments/create-order` success | `amount`, `listing_id`        |
| `payment_completed`      | `/api/payments/verify` success       | `amount`, `listing_id`        |
| `contact_revealed`       | After payment verify                 | `listing_id`                  |
| `admin_action`           | Any `/admin` mutation                | `action_type`                 |

### Key Funnels to Monitor During Beta

**Funnel 1 — Acquisition:**
`page_viewed` → `signup_started` → `signup_completed` → `phone_otp_verified`

**Funnel 2 — Seller activation:**
`signup_completed` → `phone_otp_verified` → `listing_create_started` → `listing_published`

**Funnel 3 — Buyer conversion:**
`listing_viewed` → `interest_expressed` → `payment_initiated` → `payment_completed` → `contact_revealed`

**Funnel 4 — Retention:**
D1, D7, D30 return visits (PostHog → Insights → Retention → first touch: `signup_completed`)

---

## Key Metrics Dashboard (Manual Check Daily During Beta)

Review these every morning until the beta stabilises:

| Metric               | Where to check                         | Target                                       |
| -------------------- | -------------------------------------- | -------------------------------------------- |
| API error rate       | Fly.io logs / Sentry → Issues          | < 1% of requests                             |
| P95 API latency      | Sentry → Performance → Backend         | < 500 ms                                     |
| Auth success rate    | Supabase Dashboard → Logs → Auth       | > 95%                                        |
| OTP delivery rate    | MSG91 Dashboard → Reports              | > 95%                                        |
| Payment success rate | Razorpay Dashboard → Payments          | > 90%                                        |
| Uptime               | UptimeRobot / Better Uptime dashboard  | 99.9%                                        |
| Memory usage         | `fly metrics --app chapternew-staging` | < 800 MB (VM has 1 GB)                       |
| Machine count        | `fly status --app chapternew-staging`  | Exactly 1 running (min_machines_running = 1) |

---

## Incident Response Playbook

### Payment Failure

Symptoms: buyer reports payment not completing; Razorpay dashboard shows failed orders.

1. Check recent payment logs:
   ```bash
   fly logs --app chapternew-staging | grep 'payment'
   ```
2. Check Razorpay Dashboard → Payments → Failed — note the error code
3. Verify secrets are present:
   ```bash
   fly secrets list --app chapternew-staging
   # RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET should all appear
   ```
4. Check webhook delivery in Razorpay Dashboard → Settings → Webhooks → Recent deliveries
5. Test the order creation endpoint directly:
   ```bash
   curl -X POST https://staging.chapternew.com/api/payments/create-order \
     -H "Content-Type: application/json" \
     -H "Cookie: <valid session cookie>" \
     -d '{"interestId":"<uuid>"}'
   ```
6. If `RAZORPAY_KEY_SECRET` is missing or wrong: re-set it and redeploy:
   ```bash
   fly secrets set RAZORPAY_KEY_SECRET="correct-value" --app chapternew-staging
   ```

### Auth Failure

Symptoms: users cannot log in; Google OAuth redirects to error page.

1. Check auth logs in Supabase Dashboard → Logs → Auth (filter last 30 min)
2. Verify Supabase URL and keys match between Fly.io secrets and the Supabase project:
   ```bash
   fly secrets list --app chapternew-staging
   # NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY should appear
   ```
3. Confirm Google OAuth redirect URL is registered:
   - Supabase Dashboard → Authentication → URL Configuration
   - `https://staging.chapternew.com/auth/callback` must be in the Redirect URLs list
4. Check app logs for Supabase client initialisation errors:
   ```bash
   fly logs --app chapternew-staging | grep '"level":"error"'
   ```

### OTP Not Delivered

Symptoms: users report never receiving the SMS verification code.

1. Check MSG91 delivery reports:
   - MSG91 Dashboard → Reports → filter by phone number or time range
2. Check app logs for MSG91 errors:
   ```bash
   fly logs --app chapternew-staging | grep 'msg91\|otp'
   ```
3. Verify MSG91 secrets are set:
   ```bash
   fly secrets list --app chapternew-staging
   # MSG91_AUTH_KEY and MSG91_TEMPLATE_ID should appear
   ```
4. Temporary fallback: if MSG91 is down and the beta must continue,
   **unset `MSG91_AUTH_KEY`** — the app will fall back to logging OTPs to stdout
   (Fly.io logs), which is acceptable for a controlled staging beta:
   ```bash
   fly secrets unset MSG91_AUTH_KEY --app chapternew-staging
   # Redeploy triggers automatically after secrets change
   # OTPs will appear in: fly logs --app chapternew-staging | grep 'otp'
   ```
   Re-set the key once MSG91 is back:
   ```bash
   fly secrets set MSG91_AUTH_KEY="your-auth-key" --app chapternew-staging
   ```

### App Crashes / OOM

Symptoms: UptimeRobot alert fires; `/api/health` returns 503; `fly status` shows machine restarting.

1. Check machine status:
   ```bash
   fly status --app chapternew-staging
   ```
2. Check logs around the crash time:
   ```bash
   fly logs --app chapternew-staging | tail -100
   ```
3. Check memory metrics:
   ```bash
   fly metrics --app chapternew-staging
   ```
4. If OOM: scale memory (current VM is 1 GB; Next.js server typically uses 400–600 MB):
   ```bash
   fly scale memory 2048 --app chapternew-staging
   ```
5. SSH in to inspect the running process if needed:
   ```bash
   fly ssh console --app chapternew-staging
   ```

### Database Unreachable

Symptoms: `/api/health` returns `{"status":"down"}`; all API routes return 500.

1. Check Supabase Status page: [status.supabase.com](https://status.supabase.com)
2. Check health response body for which check failed:
   ```bash
   curl https://staging.chapternew.com/api/health | jq .
   ```
3. Verify `SUPABASE_SERVICE_ROLE_KEY` has not been rotated in Supabase without updating Fly.io:
   - Supabase Dashboard → Project Settings → API → service_role key
   - If rotated: `fly secrets set SUPABASE_SERVICE_ROLE_KEY="new-key" --app chapternew-staging`
