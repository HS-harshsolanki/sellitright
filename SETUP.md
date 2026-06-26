# SellItRight — Setup & Deploy Guide

## Local Development

1. Copy env file: `cp .env.example .env.local`
2. Fill in Supabase credentials from https://supabase.com/dashboard
3. Run migrations in Supabase SQL Editor (in order):
   - infrastructure/supabase/001_listings.sql
   - infrastructure/supabase/002_admin.sql
   - infrastructure/supabase/003_rls_fixes.sql
   - infrastructure/supabase/004_buyer_interest.sql
   - infrastructure/supabase/005_payments.sql
   - infrastructure/supabase/006_indexes.sql
   - infrastructure/supabase/007_rls_contact_protection.sql
4. Create `photos` bucket in Supabase Storage → set as Public
5. Enable Google OAuth in Supabase Auth → Providers → Google
6. Run: `pnpm install && pnpm dev`

## Production Deploy (Fly.io)

### One-time setup

```sh
fly auth login
fly apps create sellitright
```

### Set secrets

```sh
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  ADMIN_SECRET_KEY="your-strong-random-secret" \
  RAZORPAY_KEY_ID="rzp_live_..." \
  RAZORPAY_KEY_SECRET="your-key-secret" \
  RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"
```

### Deploy

```sh
fly deploy
```

### Configure Razorpay Webhook

In Razorpay Dashboard → Settings → Webhooks:

- URL: `https://sellitright.fly.dev/api/payments/webhook`
- Events: `payment.captured`, `order.paid`
- Secret: (same as RAZORPAY_WEBHOOK_SECRET above)

## Pre-launch Checklist

- [ ] All 7 SQL migrations run in production Supabase
- [ ] `photos` bucket created and set to Public in Supabase Storage
- [ ] All Fly.io secrets set
- [ ] Razorpay webhook URL configured
- [ ] Google OAuth callback URL set: `https://sellitright.fly.dev/auth/callback`
- [ ] Custom domain configured (optional)
