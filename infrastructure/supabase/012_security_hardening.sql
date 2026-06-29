-- 012_security_hardening.sql
-- Security audit fixes (idempotent — safe to run multiple times):
--   1. Fix RLS policy name mismatch on buyer_interest
--      Root cause: 004_buyer_interest.sql created "Seller can read interests on own listings"
--      but the DROP in this file previously targeted wrong variant names, leaving the
--      old policy in place and causing CREATE to fail with "already exists".
--      Fix: DROP the EXACT name being created immediately before each CREATE POLICY.
--   2. Create buyer_interest_safe view (masks contact columns before payment)
--   3. Grant safe view to authenticated role
--   4. Add explicit INSERT deny policies for payments and notifications (server-side only)
--   5. Ensure RLS is enabled on all sensitive tables

-- ── 1. Fix RLS policy name mismatch on buyer_interest ────────────────────────
-- Drop ALL known name variants (canonical from 004, variant from apps/web 006,
-- and the name we are about to create) so the slate is clean before CREATE.

-- Buyer-side: drop every known variant, then recreate canonical name
drop policy if exists "Buyer can read own interests"         on public.buyer_interest;
drop policy if exists "Buyers can view own interests"        on public.buyer_interest;

create policy "Buyer can read own interests"
  on public.buyer_interest
  for select
  to authenticated
  using (buyer_id = auth.uid());

-- Seller-side: drop every known variant (the bug was here — the old DROP list
-- used "Seller can read own listing interests" and "Sellers can view interests
-- on their listings", neither of which matched the actual name created by
-- 004_buyer_interest.sql: "Seller can read interests on own listings").
drop policy if exists "Seller can read interests on own listings"     on public.buyer_interest;
drop policy if exists "Seller can read own listing interests"         on public.buyer_interest;
drop policy if exists "Sellers can view interests on their listings"  on public.buyer_interest;
drop policy if exists "Sellers can view interests on own listings"    on public.buyer_interest;

create policy "Seller can read interests on own listings"
  on public.buyer_interest
  for select
  to authenticated
  using (seller_id = auth.uid());

-- ── 2. Create buyer_interest_safe view ───────────────────────────────────────
-- This view masks seller_phone, seller_email, buyer_phone, buyer_email
-- until contact_unlocked = true. Use this view for any SELECT that should
-- respect the payment gate.
-- Uses CREATE OR REPLACE so it is safe to re-run.

create or replace view public.buyer_interest_safe
  with (security_invoker = true)
as
select
  id,
  listing_id,
  buyer_id,
  seller_id,
  full_name,
  purpose,
  timeline,
  funding,
  message,
  status,
  contact_unlocked,
  case when contact_unlocked then seller_phone  else null end as seller_phone,
  case when contact_unlocked then seller_email  else null end as seller_email,
  case when contact_unlocked then buyer_phone   else null end as buyer_phone,
  case when contact_unlocked then buyer_email   else null end as buyer_email,
  created_at,
  updated_at
from public.buyer_interest;

-- Grant SELECT on the safe view to authenticated users (GRANT is idempotent)
grant select on public.buyer_interest_safe to authenticated;

-- ── 3. Explicit INSERT deny policies (defence-in-depth) ───────────────────────
-- Prevent direct INSERT from client-side on tables that should only be written
-- by service-role server code.

-- payments: only service-role should insert
drop policy if exists "No direct insert on payments"      on public.payments;
create policy "No direct insert on payments"
  on public.payments
  for insert
  to authenticated
  with check (false);

-- notifications: only service-role should insert
drop policy if exists "No direct insert on notifications" on public.notifications;
create policy "No direct insert on notifications"
  on public.notifications
  for insert
  to authenticated
  with check (false);

-- ── 4. Ensure RLS is enabled on all sensitive tables ─────────────────────────
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is a no-op if already enabled.
alter table public.payments      enable row level security;
alter table public.notifications enable row level security;
alter table public.reports       enable row level security;
alter table public.audit_log     enable row level security;
alter table public.user_flags    enable row level security;
alter table public.risk_scores   enable row level security;
alter table public.activity_logs enable row level security;
alter table public.blocked_users enable row level security;
