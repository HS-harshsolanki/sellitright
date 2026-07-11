# ChapterNew — Staging Environment Setup

## Overview

This document walks through setting up a complete, isolated staging environment for ChapterNew. Staging uses:

- A separate **Supabase project** (distinct from production)
- A separate **Fly.io app** (`chapternew-staging`) in the same region
- **Razorpay test-mode** keys (no real money changes hands)
- **MSG91 staging credentials** or console-fallback OTP mode

Staging is accessible at `https://staging.chapternew.com` and gated behind a beta access code.

---

## Prerequisites

Before you start, ensure you have the following installed and authenticated:

| Tool            | Version | Install                              |
| --------------- | ------- | ------------------------------------ |
| Node.js         | 20+     | `brew install node`                  |
| pnpm            | 9+      | `npm install -g pnpm`                |
| flyctl          | latest  | `brew install flyctl`                |
| Supabase CLI    | latest  | `brew install supabase/tap/supabase` |
| gh (GitHub CLI) | latest  | `brew install gh`                    |

Accounts required:

- [Supabase](https://supabase.com) — free tier is sufficient for staging
- [Fly.io](https://fly.io) — `fly auth login`
- [Razorpay](https://dashboard.razorpay.com) — test-mode API keys
- [MSG91](https://msg91.com) — optional; skip for console OTP fallback

---

## Step 1: Create Supabase Staging Project

Creates an isolated Postgres database and auth instance separate from production.

**Steps:**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Fill in:
   - **Name:** `chapternew-staging`
   - **Database password:** generate a strong password and save it in your password manager
   - **Region:** Singapore (ap-southeast-1) — matches Fly.io `sin` region
   - **Pricing plan:** Free tier
4. Wait for the project to initialize (~2 minutes)
5. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)
6. Go to **Project Settings → General** and copy the **Reference ID** (used for CLI commands)

**Verify:** The project dashboard loads without errors and shows 0 tables.

**Common errors:**

- _Project stuck in "Coming Up" state_ — wait 3-4 minutes and refresh. If still stuck, contact Supabase support.

---

## Step 2: Configure Supabase Staging Auth (Google OAuth + Redirect URLs)

Configures Google OAuth so users can sign in with their Google accounts on staging.

**Steps:**

1. In the Supabase Dashboard, go to **Authentication → Providers**
2. Enable **Google** provider
3. You will need a Google OAuth app. If you don't have one for staging:
   - Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
   - Create **OAuth 2.0 Client ID** → Web application
   - Add authorized redirect URI: `https://YOUR_STAGING_PROJECT.supabase.co/auth/v1/callback`
   - Save **Client ID** and **Client Secret**
4. Paste Client ID and Client Secret into the Supabase Google provider settings
5. Go to **Authentication → URL Configuration** and set:
   - **Site URL:** `https://staging.chapternew.com`
   - **Redirect URLs:** add `https://staging.chapternew.com/**`
6. Save

**Verify:** Auth settings page shows Google as enabled with a green checkmark.

**Common errors:**

- _redirect_uri_mismatch from Google_ — the redirect URL in Google Cloud Console must exactly match `https://YOUR_STAGING_PROJECT.supabase.co/auth/v1/callback` including trailing slash.
- _Sign-in works on localhost but not staging_ — add `https://staging.chapternew.com/**` to Redirect URLs in Supabase (not just Google Cloud Console).

---

## Step 3: Run Database Migrations

Creates all tables, RLS policies, indexes, and helper functions in the staging database.

**Option A: Supabase SQL Editor (recommended for first setup)**

1. In the Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Open the file `infrastructure/supabase/000_complete_idempotent_schema.sql` and paste the entire contents
4. Click **Run** (or Cmd+Enter)
5. Verify output: `Success. No rows returned.`

Then run the additional migrations that are not yet in the combined schema file:

```sql
-- Run each of these in a new SQL Editor query, in order:
-- infrastructure/supabase/seeds/../apps/web/supabase/migrations/009_profiles.sql
-- apps/web/supabase/migrations/011_chat.sql
```

Open and paste each of those files in order.

**Option B: Supabase CLI**

```bash
# Set your staging project reference ID
export SUPABASE_PROJECT_REF="your-staging-project-ref"

# Run the combined schema
supabase db execute \
  --project-ref "$SUPABASE_PROJECT_REF" \
  < infrastructure/supabase/000_complete_idempotent_schema.sql

# Run additional migrations
supabase db execute \
  --project-ref "$SUPABASE_PROJECT_REF" \
  < apps/web/supabase/migrations/009_profiles.sql

supabase db execute \
  --project-ref "$SUPABASE_PROJECT_REF" \
  < apps/web/supabase/migrations/011_chat.sql
```

**Verify:** Go to **Table Editor** in the Supabase Dashboard. You should see the following tables: `listings`, `profiles`, `buyer_interest`, `payments`, `chat_threads`, `chat_messages`, `notifications`, `audit_log`, `reports`, `user_flags`, and several others.

**Common errors:**

- _"permission denied for schema auth"_ — you must run the schema in the Supabase SQL Editor (which runs as `postgres`), not via a local `psql` connection using the anon or service role key.
- _"type already exists"_ — safe to ignore. The schema is idempotent and uses `ON CONFLICT` / `exception when duplicate_object` guards.

---

## Step 4: Load Seed Data

Populates staging with realistic Indian real estate listings, buyers, sellers, and conversations so the app has content to work with immediately.

**Steps:**

1. In the Supabase SQL Editor, open a new query
2. Paste the entire contents of `infrastructure/supabase/seeds/staging_seed.sql`
3. Click **Run**
4. Verify the output shows no errors

**What the seed creates:**

| Table          | Records | Details                                                    |
| -------------- | ------- | ---------------------------------------------------------- |
| auth.users     | 8       | 3 sellers, 4 buyers, 1 admin                               |
| profiles       | 8       | mirrors auth.users                                         |
| listings       | 9       | 7 ACTIVE, 2 PENDING_REVIEW across Mumbai, Bangalore, Delhi |
| buyer_interest | 8       | 3 accepted+unlocked, 1 accepted, 4 pending                 |
| payments       | 3       | all SUCCESS (₹49 platform fee)                             |
| chat_threads   | 3       | active conversations                                       |
| chat_messages  | 9       | realistic property discussion messages                     |
| notifications  | 13      | mix of read and unread                                     |

**Verify:** Go to **Table Editor → listings**. You should see 9 rows with properties in Mumbai, Bangalore, and Delhi.

**To reset seed data:**

```sql
-- In Supabase SQL Editor:
-- Paste infrastructure/supabase/seeds/staging_cleanup.sql and run
-- Then re-run staging_seed.sql
```

**Common errors:**

- _"insert or update on table violates foreign key constraint"_ — the seed inserts into `auth.users` first. If that section fails (e.g., due to schema differences), the `public.profiles` and listing inserts will also fail. Fix the auth.users section first.
- _"column X does not exist"_ — the additional migrations (009_profiles, 011_chat) have not been run yet. Complete Step 3 first.

---

## Step 5: Configure Razorpay Test Mode

Sets up payment processing using Razorpay's sandbox environment. No real money moves in test mode.

**Steps:**

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Toggle to **Test Mode** (switch in the top-left corner)
3. Go to **Settings → API Keys → Generate Key**
4. Copy:
   - **Key ID** → `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - **Key Secret** → `RAZORPAY_KEY_SECRET`
5. Set up a test webhook:
   - Go to **Settings → Webhooks → Add New Webhook**
   - **URL:** `https://staging.chapternew.com/api/payments/webhook`
   - **Secret:** generate a random string (e.g., `openssl rand -hex 32`) → `RAZORPAY_WEBHOOK_SECRET`
   - Enable events: `payment.captured`, `payment.failed`
6. Save all values — you will use them in Step 8

**Test card details (for manual testing):**

| Field       | Value               |
| ----------- | ------------------- |
| Card number | 4111 1111 1111 1111 |
| Expiry      | Any future date     |
| CVV         | Any 3 digits        |
| OTP         | 1234                |

**Verify:** Test webhook endpoint shows as Active in Razorpay Dashboard.

**Common errors:**

- _Webhook signature mismatch_ — ensure `RAZORPAY_WEBHOOK_SECRET` exactly matches the secret entered in the Razorpay Dashboard (no extra spaces or newlines).

---

## Step 6: Configure MSG91 for Staging (or use console fallback)

Sets up OTP delivery for phone verification. For early staging, the console fallback is sufficient — OTPs are logged to Fly.io app logs instead of being sent via SMS.

**Option A: Console fallback (simplest, no cost)**

Leave `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` empty when setting secrets in Step 8. The app will log OTPs to stdout. To view:

```bash
fly logs --app chapternew-staging | grep "OTP"
```

**Option B: MSG91 staging credentials**

1. Log in to [MSG91 Dashboard](https://msg91.com)
2. Go to **Settings → API Keys** → copy the Auth Key → `MSG91_AUTH_KEY`
3. Go to **SMS → Templates** → create an OTP template with variable `##OTP##`
4. Copy the Template ID → `MSG91_TEMPLATE_ID`

**Verify (console fallback):** Trigger a phone verification on staging and run `fly logs --app chapternew-staging | grep -i otp`. The OTP should appear within a few seconds.

---

## Step 7: Create Fly.io Staging App

Creates an isolated Fly.io application for staging, separate from the production `chapternew` app.

**Steps:**

```bash
# Authenticate with Fly.io (if not already)
fly auth login

# Create the staging app (replace <your-org> with your Fly.io organization slug)
fly apps create chapternew-staging --org <your-org>

# Verify the app was created
fly status --app chapternew-staging
```

**Verify:** `fly apps list` shows `chapternew-staging` with status `suspended` (expected before first deploy).

**Common errors:**

- _"app name already taken"_ — app names are globally unique on Fly.io. Try `chapternew-staging-yourname`.
- _"organization not found"_ — run `fly orgs list` to see your organization slug.

---

## Step 8: Set Fly.io Staging Secrets

Injects all environment variables as encrypted secrets into the staging app.

**Steps:**

```bash
fly secrets set --app chapternew-staging \
  NEXT_PUBLIC_SUPABASE_URL="https://YOUR_STAGING_PROJECT.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  NEXT_PUBLIC_APP_URL="https://staging.chapternew.com" \
  NEXT_PUBLIC_APP_ENV="staging" \
  ADMIN_SECRET_KEY="$(openssl rand -hex 32)" \
  ADMIN_SESSION_SECRET="$(openssl rand -hex 32)" \
  OTP_HMAC_SECRET="$(openssl rand -hex 32)" \
  BETA_ACCESS_CODE="CHAPTERNEW2024" \
  NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY" \
  RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY" \
  RAZORPAY_KEY_SECRET="YOUR_TEST_SECRET" \
  RAZORPAY_WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"
```

For MSG91 (optional — omit if using console fallback):

```bash
fly secrets set --app chapternew-staging \
  MSG91_AUTH_KEY="YOUR_MSG91_KEY" \
  MSG91_TEMPLATE_ID="YOUR_TEMPLATE_ID"
```

**Verify:**

```bash
fly secrets list --app chapternew-staging
```

You should see all secret names listed (values are redacted).

**Important notes:**

- `NEXT_PUBLIC_*` variables are embedded into the Next.js build at build time. They must be passed as Docker build args, not just as runtime secrets. The GitHub Actions workflow in `.github/workflows/deploy.yml` handles this automatically via `--build-arg`.
- `ADMIN_SECRET_KEY` and `ADMIN_SESSION_SECRET` are used for the admin panel. Store them in your team password manager.
- `BETA_ACCESS_CODE` is the code users enter on the `/beta` page to access the app. Change this before sharing with external testers.

**Common errors:**

- _Variables not reflecting in the app_ — `NEXT_PUBLIC_*` vars are baked into the JS bundle at build time. After changing them, you must trigger a new deploy (they cannot be hot-updated via `fly secrets set` alone).

---

## Step 9: Configure GitHub Secrets for Staging Deployment

Stores Fly.io deploy credentials in GitHub so CI/CD can deploy automatically on push to the staging branch.

**Steps:**

1. Generate a Fly.io deploy token scoped to the staging app:

   ```bash
   fly tokens create deploy --app chapternew-staging --name "github-actions-staging"
   ```

   Copy the token.

2. Go to your GitHub repository → **Settings → Secrets and variables → Actions**

3. Add the following secrets:

   | Secret name                             | Value                            |
   | --------------------------------------- | -------------------------------- |
   | `FLY_API_TOKEN_STAGING`                 | The deploy token from step 1     |
   | `NEXT_PUBLIC_SUPABASE_URL_STAGING`      | Your staging Supabase URL        |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING` | Your staging anon key            |
   | `NEXT_PUBLIC_APP_URL_STAGING`           | `https://staging.chapternew.com` |
   | `NEXT_PUBLIC_RAZORPAY_KEY_ID_STAGING`   | `rzp_test_YOUR_TEST_KEY`         |

**Verify:** Go to **Actions → (any workflow run)** and verify it can access the secrets by checking workflow logs.

---

## Step 10: Deploy to Staging

Builds the Docker image and deploys to the staging Fly.io app.

**Manual deploy (first time or for debugging):**

```bash
# From the repo root
fly deploy \
  --app chapternew-staging \
  --config fly.toml \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://YOUR_STAGING_PROJECT.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." \
  --build-arg NEXT_PUBLIC_APP_URL="https://staging.chapternew.com" \
  --build-arg NEXT_PUBLIC_APP_ENV="staging" \
  --build-arg NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY"
```

**Automated deploy via GitHub Actions:**

Push to the `staging` branch:

```bash
git checkout -b staging
git push origin staging
```

The `.github/workflows/deploy-staging.yml` workflow (once configured in Step 9) will trigger automatically.

**Monitor the deploy:**

```bash
fly logs --app chapternew-staging
```

**Verify:** The deploy completes with `v1 deployed successfully`. The health check at `/api/health` returns 200.

```bash
curl https://staging.chapternew.com/api/health
# Expected: {"status":"ok"}
```

**Common errors:**

- _"Build failed: COPY failed"_ — check that `apps/web/Dockerfile` and `turbo.json` exist and are not gitignored.
- _Machine fails health checks_ — run `fly logs --app chapternew-staging` to see startup errors. Common cause: missing secret (Supabase URL/key not set).
- _"Error: app not found"_ — ensure `--app chapternew-staging` matches the app name created in Step 7.

---

## Step 11: Verify Deployment (Smoke Tests)

Runs automated checks against all critical endpoints to confirm the deployment is healthy.

**Steps:**

```bash
# Make the script executable
chmod +x scripts/smoke-test-staging.sh

# Run against the staging URL
STAGING_URL=https://staging.chapternew.com ./scripts/smoke-test-staging.sh
```

**Expected output:**

```
Running smoke tests against https://staging.chapternew.com...

✓ Health endpoint (200)
✓ Homepage (200)
✓ Properties page (200)
✓ Robots.txt blocks staging (200)
✓ Login page (200)
✓ Dashboard redirects (200)
✓ API listings (200)
✓ Admin auth guard (401)
✓ Listings API auth guard (401)
✓ Notifications auth guard (401)

Results: 10 passed, 0 failed
STAGING SMOKE TEST PASSED
```

**If any check fails:**

1. Run `fly logs --app chapternew-staging` to see server errors
2. Check the Supabase Dashboard for database connection issues
3. Verify all secrets are set with `fly secrets list --app chapternew-staging`

---

## Step 12: Configure Beta Access Code

The beta access code gate prevents public access to staging. Users must enter the code on the `/beta` page before they can use the app.

**To change the beta access code:**

```bash
fly secrets set --app chapternew-staging BETA_ACCESS_CODE="YOURNEWCODE2024"
```

Note: changing a runtime secret does **not** require a redeploy — the new value takes effect on the next request.

**To share the beta link with testers:**

1. Send testers the URL: `https://staging.chapternew.com`
2. When prompted, they enter the beta access code
3. The code is stored in a cookie for their session

**To revoke a tester's access:**
Change the `BETA_ACCESS_CODE` secret. All existing sessions will be invalidated on their next page load.

---

## Beta User Management

**Adding a seed admin (for reviewing listings in staging):**

Run this in the Supabase SQL Editor for your staging project. Replace `YOUR_USER_UUID` with the actual UUID of a user who has logged in via Google OAuth:

```sql
INSERT INTO public.admin_roles (user_id, role)
VALUES ('YOUR_USER_UUID', 'super_admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
```

To find a user's UUID after they have logged in:

```sql
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

**Listing seed users (for testing without OAuth):**

The seed data creates stub users in `auth.users` but these cannot be logged into via the app's OAuth flow. They are useful for testing API endpoints directly using the Supabase service role key (e.g., with a REST client like Postman or Insomnia).

Seed user emails are all `*.seed@chapternew.dev`.

**Resetting staging data:**

```bash
# In Supabase SQL Editor, run staging_cleanup.sql then staging_seed.sql
# Or to wipe everything and start fresh:
# 1. Go to Supabase Dashboard → Settings → Danger Zone → Reset database
# 2. Re-run Step 3 (migrations) and Step 4 (seed data)
```

---

## Troubleshooting

### App shows 500 error on all pages

Check logs:

```bash
fly logs --app chapternew-staging
```

Most likely cause: `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` was not passed as a build arg during deploy. These are baked into the bundle and cannot be injected at runtime.

Fix: redeploy with the correct `--build-arg` flags.

### Google OAuth redirects back to production URL

`NEXT_PUBLIC_APP_URL` was set to `https://chapternew.com` instead of `https://staging.chapternew.com`. Also verify the Supabase Dashboard → Authentication → URL Configuration has the staging URL as the Site URL.

### "Invalid API key" from Supabase

The `SUPABASE_SERVICE_ROLE_KEY` secret in Fly.io may have been set with the production key instead of the staging key. Verify:

```bash
fly ssh console --app chapternew-staging
# Inside the machine:
echo $SUPABASE_SERVICE_ROLE_KEY | head -c 20
# Compare with the key in the Supabase staging project settings
```

### OTP not received

If using MSG91: Check `fly logs --app chapternew-staging` for delivery errors.

If using console fallback (MSG91 keys not set): OTPs are printed to logs. Run:

```bash
fly logs --app chapternew-staging | grep -i "otp\|phone"
```

### Razorpay payment fails at checkout

Confirm you are using test-mode keys (`rzp_test_...` prefix). The test card is `4111 1111 1111 1111` with OTP `1234`.

### Notifications not appearing in real-time

Supabase Realtime must be enabled for the `notifications` table. In the Supabase Dashboard, go to **Database → Replication** and verify `notifications` is listed under the `supabase_realtime` publication. If not, run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

---

## Rollback Procedure

If staging is broken and you need to revert to a known-good version:

**Option A: Redeploy a previous image**

```bash
# List recent releases
fly releases --app chapternew-staging

# Roll back to a specific version (e.g., v5)
fly deploy --app chapternew-staging --image registry.fly.io/chapternew-staging:v5
```

**Option B: Roll back via GitHub Actions**

Find the last passing deploy in GitHub Actions and re-run that workflow.

**Option C: Reset database and reseed**

If database state is corrupt:

1. Supabase Dashboard → **Settings → Database → Reset database** (WARNING: deletes all data)
2. Re-run migrations (Step 3)
3. Re-run seed data (Step 4)
4. Redeploy the app (Step 10)
