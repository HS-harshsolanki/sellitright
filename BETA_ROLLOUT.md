# ChapterNew Beta Rollout Plan

## Phase Overview

| Phase   | Who              | Users | Duration | Goal                          |
| ------- | ---------------- | ----- | -------- | ----------------------------- |
| Phase 0 | Internal Team    | 3-5   | Day 1-2  | Smoke test, find showstoppers |
| Phase 1 | Friends & Family | 10    | Day 3-4  | UX feedback, real-world auth  |
| Phase 2 | Invited Testers  | 25    | Day 5-6  | Core flows, payment test      |
| Phase 3 | Early Adopters   | 50    | Day 7-10 | Load test, edge cases         |
| Phase 4 | Open Beta        | 100+  | Day 11+  | Pre-production confidence     |

---

## Phase 0 — Internal Team (Day 1-2)

**Who:** 3-5 founders, engineers, and one non-technical team member.

### Success Metrics

- Health endpoint returns 200 within 1s on cold start
- Google OAuth sign-in works end-to-end (login → dashboard) for all team members
- At least 1 seller can create and submit a listing
- At least 1 buyer can browse listings and submit an interest request
- At least 1 completed Razorpay test payment (₹49) unlocks a contact
- Zero unhandled exceptions in Fly.io logs during the session

### Rollback Criteria

Any of the following triggers immediate rollback to a known-good deploy:

- Sign-in page returns 500 or crashes
- Database writes fail silently (interest submitted but not visible in dashboard)
- Razorpay order creation API returns 500
- Admin panel inaccessible for admin-role users

### Monitoring Focus

- `fly logs --app chapternew-staging` open in a terminal throughout
- Supabase Dashboard → **Logs → API** for database errors
- Razorpay Dashboard → Test mode → Payments for transaction status

### Go/No-Go Decision

**Go:** All success metrics met, no rollback criteria triggered.
**No-Go:** Fix showstoppers, re-test same day, re-evaluate within 24 hours.

---

## Phase 1 — Friends & Family (Day 3-4)

**Who:** 10 people known to the team. Mix of real estate buyers (people who have recently searched for property) and at least 2 potential sellers.

**Access:** Share beta access code directly via WhatsApp or email. Provide the staging URL and a 3-sentence explanation of what ChapterNew does.

### Success Metrics

- 8 of 10 users successfully complete sign-in on their own (no hand-holding)
- At least 3 users submit a buyer interest on a listing
- At least 1 user completes a test payment without prompting
- Zero users report being unable to reach the app (uptime)
- Qualitative: majority describe the sign-up and browsing flow as "easy" or "straightforward"

### Rollback Criteria

- Sign-in error rate exceeds 20% (2+ users cannot log in after 2 attempts)
- Listing detail page fails to load for any tester
- Any financial data (even test payment data) appears to be leaked to wrong user
- A tester can view another user's private interest details or contact information

### Monitoring Focus

- Supabase Dashboard → **Logs → Auth** for failed sign-ins
- `buyer_interest` table: verify no interest row is readable by a user who is neither the buyer nor the seller (RLS check)
- Fly.io memory usage: should stay below 800MB under 10 concurrent users

### Go/No-Go Decision

**Go:** Success metrics met; no security incidents; no P0 bugs reported.
**No-Go:** Identify root cause of each failed metric, fix, and re-test with fresh Phase 1 invites.

---

## Phase 2 — Invited Testers (Day 5-6)

**Who:** 25 people. Sourced from a pre-launch waitlist or targeted outreach. Should include a realistic mix of real estate buyers (people actively searching), sellers (people who have a property to sell), and a few investors.

**Access:** Personalised invite with beta code, a 1-page onboarding PDF, and a Typeform feedback link.

### Success Metrics

- Seller flow fully tested: listing creation → submission → admin approval → listing goes ACTIVE
- Payment flow tested: interest accepted → buyer pays ₹49 → contact unlocked → both seller and buyer receive correct notification
- Chat flow: at least 5 real buyer-seller conversations started
- Notification bell shows accurate unread count and marks as read
- Mobile UX: at least 10 testers on mobile, all reporting no layout breakage
- Response to 1-question survey ("How easy was it to find a property?") averages 3.5+ out of 5

### Rollback Criteria

- Error rate on `/api/payments/create-order` exceeds 5%
- Any tester's notification shows another user's private data
- Chat messages delivered to wrong thread (data integrity issue)
- Admin approval flow broken (listings stuck in PENDING_REVIEW with no way to progress)
- P1 bug count exceeds 5 open bugs after 24 hours

### Monitoring Focus

- Razorpay Dashboard: verify all `payment.captured` webhook events are received and processed
- Supabase `payments` table: no orphaned PENDING rows older than 1 hour
- Notification delivery latency: Supabase Realtime pushes should appear within 3 seconds
- Admin portal: test listing review, approve, and reject flows manually

### Go/No-Go Decision

**Go:** Payment flow 100% functional in test mode; no data isolation failures; mobile layout acceptable.
**No-Go:** Any payment, notification, or chat reliability issue blocks progression. Fix and re-invite a subset of Phase 2 testers.

---

## Phase 3 — Early Adopters (Day 7-10)

**Who:** 50 people. Announced via social media / real estate communities (e.g., NoBroker forum, local housing society groups). These testers discover the app organically.

**Access:** Beta access code shared in community posts. Testers are explicitly told "this is a beta — data may be wiped before launch."

### Success Metrics

- App sustains 20 concurrent users without response time exceeding 2s on listing page
- P95 response time for `/api/listings` under 500ms
- Admin can review and action at minimum 10 listing submissions per day
- At least 3 complete end-to-end transactions (interest → accept → pay → chat → property visited in real life)
- Fraud/trust safety: no report of fake listings that bypass admin review
- Seller-reported: zero cases of buyer contact details shared before payment

### Rollback Criteria

- Fly.io machine restarts more than 3 times in 24 hours (OOM or crash loop)
- Database connection pool exhaustion (Supabase free tier: 60 connections max)
- Any bypass of the payment gate for contact unlock discovered
- User-reported: incorrect price displayed on listing (data integrity)

### Monitoring Focus

- Fly.io Metrics dashboard: CPU, memory, request count, error rate
- Supabase Dashboard → **Reports → Query Performance** for slow queries
- `user_flags` and `reports` tables: watch for emerging patterns (spam sellers, broker accounts)
- Chat violations table: review `chat_violations` daily for phone number sharing attempts
- Daily: run `./scripts/smoke-test-staging.sh` to catch regressions

### Go/No-Go Decision

**Go:** P95 < 500ms on core APIs; payment gate is airtight; admin operations scale; no P0/P1 open.
**No-Go:** Investigate performance bottleneck, add connection pooling if needed (PgBouncer via Supabase), then re-test under load.

---

## Phase 4 — Open Beta (Day 11+)

**Who:** 100+ users. No individual invites. Beta code published openly.

**Access:** Add beta code to the app's landing page footer or About page.

### Success Metrics

- App uptime 99%+ over a rolling 7-day window
- Error rate (5xx) below 0.5% of all requests
- At least 20 paid contact unlocks per week (validates core monetisation)
- New user activation: 60%+ of sign-ups browse at least one listing
- Seller activation: 30%+ of registered sellers submit at least one listing
- Zero known security vulnerabilities (run `pnpm audit` clean)
- Weekly user retention: 25%+ of Day-1 users return on Day-7

### Rollback Criteria

- Any confirmed data breach (user personal data exposed to wrong party)
- Razorpay dispute or chargeback filed
- Supabase free-tier row limit reached with no upgrade path ready
- Any single day with error rate exceeding 2%

### Monitoring Focus

- Set up uptime monitoring (e.g., BetterUptime, UptimeRobot) on `https://staging.chapternew.com/api/health`
- Weekly review of `audit_log` for unusual admin actions
- Supabase usage dashboard: rows, bandwidth, realtime connections
- Track conversion funnel: visits → sign-ups → interests submitted → payments completed

### Go/No-Go for Production Launch

**Go:** All Phase 4 success metrics met for at least 7 consecutive days. All Launch Gates (see below) are PASS. Legal review of Terms of Service and Privacy Policy complete.
**No-Go:** Address any open Launch Gate failures before pushing to `chapternew` production app.

---

## Launch Gates Table

The following checklist must be fully green before merging staging to production.

| #   | Feature Area         | Test                                                                             | Status                            |
| --- | -------------------- | -------------------------------------------------------------------------------- | --------------------------------- | ------ |
| 1   | **Authentication**   | Google OAuth sign-in completes and creates a profile row                         | MANUAL                            |
| 2   | **Authentication**   | Unauthenticated users are redirected from dashboard to /beta or /login           | MANUAL                            |
| 3   | **Beta gate**        | App redirects to /beta page without valid BETA_ACCESS_CODE cookie                | MANUAL                            |
| 4   | **Listing creation** | Seller can create a listing (DRAFT → PENDING_REVIEW) with photos                 | MANUAL                            |
| 5   | **Listing creation** | Photo upload to Supabase Storage `photos` bucket works                           | MANUAL                            |
| 6   | **Admin portal**     | Admin can view PENDING_REVIEW listings and approve or reject                     | MANUAL                            |
| 7   | **Admin portal**     | Admin approval changes listing status to ACTIVE and notifies seller              | MANUAL                            |
| 8   | **Admin auth**       | `/api/admin/*` endpoints return 401 without valid admin session                  | PASS                              |
| 9   | **Buyer interest**   | Buyer can submit interest on an ACTIVE listing (not their own)                   | MANUAL                            |
| 10  | **Buyer interest**   | Buyer cannot submit duplicate interest on same listing                           | MANUAL                            |
| 11  | **Seller response**  | Seller receives InterestRequest notification in real-time                        | MANUAL                            |
| 12  | **Seller response**  | Seller can accept or decline buyer interest                                      | MANUAL                            |
| 13  | **Payment**          | Razorpay checkout opens for accepted interest                                    | MANUAL                            |
| 14  | **Payment**          | Successful test payment marks interest as `contact_unlocked = true`              | MANUAL                            |
| 15  | **Payment**          | Seller receives PaymentReceived notification after buyer pays                    | MANUAL                            |
| 16  | **Payment**          | Buyer receives ConnectionUnlocked notification with seller contact               | MANUAL                            |
| 17  | **Contact gate**     | Seller phone/email not exposed in API response before payment                    | PASS                              |
| 18  | **Chat**             | Chat thread created automatically after interest is ACCEPTED                     | MANUAL                            |
| 19  | **Chat**             | Messages deliver in real-time (< 3s) via Supabase Realtime                       | MANUAL                            |
| 20  | **Chat**             | Phone number sharing in chat triggers a violation record                         | MANUAL                            |
| 21  | **Notifications**    | Unread count badge updates in real-time                                          | MANUAL                            |
| 22  | **Notifications**    | Marking notifications read persists across page reload                           | MANUAL                            |
| 23  | **OTP verification** | Phone verification flow completes (console fallback or MSG91)                    | MANUAL                            |
| 24  | **OTP verification** | Cannot reuse an OTP after it expires (5-minute window)                           | MANUAL                            |
| 25  | **RLS**              | Buyer cannot read another buyer's interest records                               | PASS                              |
| 26  | **RLS**              | Seller cannot self-approve a listing to ACTIVE via direct API call               | PASS                              |
| 27  | **Search**           | Property search by city returns relevant ACTIVE listings only                    | MANUAL                            |
| 28  | **Search**           | Listings in PENDING_REVIEW or DRAFT are not shown publicly                       | MANUAL                            |
| 29  | **Mobile**           | Listing browse, interest submit, and payment complete on mobile (iOS Safari)     | MANUAL                            |
| 30  | **Mobile**           | Listing browse, interest submit, and payment complete on mobile (Android Chrome) | MANUAL                            |
| 31  | **SEO / Robots**     | `robots.txt` on staging disallows all crawlers                                   | PASS                              |
| 32  | **Error handling**   | 404 page renders for unknown routes                                              | MANUAL                            |
| 33  | **Error handling**   | Global error boundary renders for unhandled React errors                         | MANUAL                            |
| 34  | **Performance**      | Listing detail page LCP < 2.5s on 3G (Lighthouse mobile)                         | MANUAL                            |
| 35  | **Security**         | `pnpm audit` returns 0 critical vulnerabilities                                  | MANUAL                            |
| 36  | **Security**         | No API key or secret in git history (run `git log -p                             | grep -i "secret\|key\|password"`) | MANUAL |

**PASS** = automated check in smoke test or RLS verified in schema.
**MANUAL** = requires a human tester to verify during beta phases.

---

## Daily Monitoring Checklist

Run this every morning during the beta period (Phases 1-4).

### 1. App health (5 min)

```bash
# Run smoke tests
STAGING_URL=https://staging.chapternew.com ./scripts/smoke-test-staging.sh

# Check for overnight errors
fly logs --app chapternew-staging --since 12h | grep -E "ERROR|error|500|crash" | tail -30
```

### 2. Database health (5 min)

In Supabase SQL Editor:

```sql
-- Listings requiring admin action
SELECT COUNT(*) as pending_listings
FROM public.listings
WHERE status = 'PENDING_REVIEW';

-- Interests older than 48h without seller response
SELECT COUNT(*) as stale_interests
FROM public.buyer_interest
WHERE status = 'PENDING'
  AND created_at < now() - interval '48 hours';

-- Failed payments in last 24h
SELECT COUNT(*) as failed_payments
FROM public.payments
WHERE status = 'FAILED'
  AND created_at > now() - interval '24 hours';

-- Orphaned PENDING payments (interest already accepted, payment stuck)
SELECT p.id, p.created_at, p.status
FROM public.payments p
JOIN public.buyer_interest bi ON p.interest_id = bi.id
WHERE p.status = 'PENDING'
  AND p.created_at < now() - interval '1 hour';
```

### 3. Fly.io machine health (2 min)

```bash
# Check machine status
fly status --app chapternew-staging

# Check resource usage
fly machine list --app chapternew-staging
```

### 4. Trust & safety (5 min)

```sql
-- New reports in last 24h
SELECT COUNT(*) as new_reports
FROM public.reports
WHERE created_at > now() - interval '24 hours'
  AND status = 'OPEN';

-- New chat violations
SELECT COUNT(*) as new_violations
FROM public.chat_violations
WHERE created_at > now() - interval '24 hours';

-- Users flagged in last 24h
SELECT user_id, flag, reason, created_at
FROM public.user_flags
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

### 5. Tester feedback review (10 min)

- Check the feedback form responses (Typeform / Google Form)
- Triage new bug reports into P0 (showstopper), P1 (major), P2 (minor)
- Update GitHub Issues with any new bugs found

### 6. Go/No-Go for next phase

At the end of each phase's duration, evaluate the Go/No-Go criteria defined above. Record the decision in a team channel with a brief rationale.

---

## Rollback Procedure

If a critical issue is discovered during beta:

```bash
# 1. Check available releases
fly releases --app chapternew-staging

# 2. Roll back to last good version (e.g., v3)
fly deploy --app chapternew-staging --image registry.fly.io/chapternew-staging:v3

# 3. Notify testers
# Post in the beta tester WhatsApp/Slack group:
# "We have temporarily rolled back staging to fix a critical issue.
#  The app is back online. Thank you for your patience."

# 4. Investigate the issue in a branch, fix, and redeploy
# Do NOT push fixes directly to the staging branch without testing locally first.
```

**P0 Incident Response:**

1. Roll back immediately (do not investigate with live testers affected)
2. Open a dedicated GitHub Issue tagged `P0`
3. Assign to the engineer on call
4. Target fix time: within 4 hours for Phase 0-2, within 8 hours for Phase 3-4
5. After fix: smoke test locally, deploy to staging, run `smoke-test-staging.sh`, confirm green, then notify testers
