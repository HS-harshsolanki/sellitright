-- Migration 003: Trust & Safety
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → Run)
--
-- Creates:
--   • activity_logs    — rate-limit and spam detection counters
--   • reports          — buyer/seller/listing abuse reports
--   • blocked_users    — directional user-to-user blocks
--   • risk_scores      — per-user broker/spam risk score (Low/Medium/High)
--   • admin_flags      — admin-applied status flags on users
-- Adds:
--   • is_blocked, admin_flag columns to auth.users via profiles table assumption
--     (we add admin_flag + is_suspended to a user_profiles helper table)

-- ── activity_logs ─────────────────────────────────────────────────────────────
-- Append-only. Used to compute rate limits (10 requests/day) and detect bursts.

create table if not exists public.activity_logs (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  action        text        not null,   -- 'interest_request' | 'report' | 'block' | 'listing_view'
  entity_type   text,                   -- 'listing' | 'interest' | 'user'
  entity_id     text,
  ip_address    text,                   -- stored for broker detection (same IP many accounts)
  metadata      jsonb       default '{}',
  created_at    timestamptz default now()
);

create index if not exists activity_logs_user_action_idx
  on public.activity_logs(user_id, action, created_at desc);

create index if not exists activity_logs_entity_idx
  on public.activity_logs(entity_type, entity_id, created_at desc);

alter table public.activity_logs enable row level security;

-- Users can read their own logs; inserts happen via service role only
create policy "Users read own activity"
  on public.activity_logs
  for select
  using (auth.uid() = user_id);

-- ── reports ───────────────────────────────────────────────────────────────────
-- Covers both:
--   reporter_role = 'buyer'  → reports a listing (already_sold, wrong_info, spam_listing)
--   reporter_role = 'seller' → reports a buyer (spam_requests, abusive, broker)

create table if not exists public.reports (
  id              uuid        primary key default gen_random_uuid(),
  reporter_id     uuid        not null references auth.users(id) on delete cascade,
  reporter_role   text        not null check (reporter_role in ('buyer', 'seller')),
  -- Target: exactly one of these is non-null
  target_user_id  uuid        references auth.users(id) on delete set null,
  target_listing_id text,
  -- Reason codes
  reason          text        not null,
  -- buyer reasons: ALREADY_SOLD | WRONG_INFORMATION | SPAM_LISTING | OTHER
  -- seller reasons: SPAM_REQUESTS | ABUSIVE_BEHAVIOR | BROKER_SUSPECTED | FAKE_DETAILS | OTHER
  details         text,       -- free-text elaboration, max 500 chars enforced in app
  -- Resolution
  status          text        not null default 'OPEN'
                              check (status in ('OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED')),
  reviewed_by     text,       -- 'api_key' or admin actor id
  reviewed_at     timestamptz,
  created_at      timestamptz default now(),

  -- Prevent duplicate reports from the same reporter on the same target
  constraint reports_unique_buyer_listing
    unique (reporter_id, target_listing_id),
  constraint reports_unique_seller_buyer
    unique (reporter_id, target_user_id),
  constraint reports_target_xor check (
    (target_user_id is null) <> (target_listing_id is null)
  )
);

create index if not exists reports_target_user_idx
  on public.reports(target_user_id, created_at desc);

create index if not exists reports_target_listing_idx
  on public.reports(target_listing_id, created_at desc);

create index if not exists reports_status_idx
  on public.reports(status, created_at desc);

alter table public.reports enable row level security;

-- Reporters can read their own reports; create via API (service role)
create policy "Reporters read own reports"
  on public.reports
  for select
  using (auth.uid() = reporter_id);

-- ── blocked_users ─────────────────────────────────────────────────────────────
-- Directional: blocker blocks blockee.
-- Both buyer-blocks-seller and seller-blocks-buyer use the same table.

create table if not exists public.blocked_users (
  id          uuid        primary key default gen_random_uuid(),
  blocker_id  uuid        not null references auth.users(id) on delete cascade,
  blockee_id  uuid        not null references auth.users(id) on delete cascade,
  reason      text,       -- optional note
  created_at  timestamptz default now(),

  constraint blocked_users_unique unique (blocker_id, blockee_id),
  constraint blocked_users_no_self_block check (blocker_id != blockee_id)
);

create index if not exists blocked_users_blocker_idx on public.blocked_users(blocker_id);
create index if not exists blocked_users_blockee_idx on public.blocked_users(blockee_id);

alter table public.blocked_users enable row level security;

-- Users can read who they have blocked
create policy "Users read own blocks"
  on public.blocked_users
  for select
  using (auth.uid() = blocker_id);

-- Users can insert blocks (blocker_id must equal their own uid)
create policy "Users create own blocks"
  on public.blocked_users
  for insert
  with check (auth.uid() = blocker_id);

-- Users can remove their own blocks
create policy "Users delete own blocks"
  on public.blocked_users
  for delete
  using (auth.uid() = blocker_id);

-- ── risk_scores ───────────────────────────────────────────────────────────────
-- One row per user. Upserted by the risk-scoring service whenever signals change.

create table if not exists public.risk_scores (
  user_id           uuid        primary key references auth.users(id) on delete cascade,
  score             integer     not null default 0 check (score >= 0 and score <= 100),
  level             text        not null default 'LOW'
                                check (level in ('LOW', 'MEDIUM', 'HIGH')),
  -- Signal breakdown — stored so admin can see why score is high
  signals           jsonb       not null default '{}',
  -- e.g. {"duplicate_phone": true, "active_listings_count": 5, "report_count": 2,
  --        "requests_per_day_avg": 8, "duplicate_descriptions": 1}
  last_computed_at  timestamptz default now(),
  created_at        timestamptz default now()
);

alter table public.risk_scores enable row level security;
-- Risk scores are admin-only; no user-facing policy. Reads via service role only.

-- ── user_flags ────────────────────────────────────────────────────────────────
-- Admin-applied status flags. One active flag per user (latest wins).

create table if not exists public.user_flags (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  flag        text        not null
              check (flag in ('SPAM', 'BROKER_SUSPECTED', 'NEEDS_REVIEW', 'SUSPENDED', 'CLEARED')),
  reason      text,
  flagged_by  text        not null default 'api_key',
  created_at  timestamptz default now()
);

create index if not exists user_flags_user_idx on public.user_flags(user_id, created_at desc);

alter table public.user_flags enable row level security;
-- Admin-only via service role. No public policies.

-- ── helper views ──────────────────────────────────────────────────────────────

-- latest_user_flag: most-recent flag per user (used by middleware / API routes)
create or replace view public.latest_user_flag as
  select distinct on (user_id)
    user_id,
    flag,
    reason,
    flagged_by,
    created_at
  from public.user_flags
  order by user_id, created_at desc;

-- daily_interest_counts: how many interest requests a buyer sent today
create or replace view public.daily_interest_counts as
  select
    user_id,
    count(*)::integer as count,
    current_date      as date
  from public.activity_logs
  where action = 'interest_request'
    and created_at >= current_date
    and created_at  < current_date + interval '1 day'
  group by user_id;

-- pending_per_listing: pending interest count per (buyer, listing)
-- Used to enforce the 3-pending-per-property rule (across all buyers)
create or replace view public.pending_per_listing as
  select
    listing_id,
    count(*)::integer as pending_count
  from public.buyer_interest
  where status = 'PENDING'
  group by listing_id;
