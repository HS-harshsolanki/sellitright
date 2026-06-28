-- =============================================================================
-- 000_complete_idempotent_schema.sql
-- ONE FILE TO RULE THEM ALL — paste this into Supabase SQL Editor and run once.
-- Safe to re-run on a partially-migrated or fully-migrated database.
-- Replaces running migrations 001–011 individually.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — ENUMS (use DO blocks so they are idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.interest_purpose as enum ('SELF', 'INVESTMENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.interest_timeline as enum (
    'IMMEDIATELY', 'WITHIN_30_DAYS', 'ONE_TO_THREE_MONTHS', 'EXPLORING'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.interest_funding as enum (
    'CASH_READY', 'LOAN_APPROVED', 'LOAN_IN_PROGRESS'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.interest_status as enum (
    'PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'
  );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — FUNCTION: set_updated_at
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- listings
create table if not exists public.listings (
  id               uuid        primary key default gen_random_uuid(),
  seller_id        uuid        not null references auth.users(id) on delete cascade,
  title            text        not null,
  description      text        not null,
  price            bigint      not null,
  property_type    text        not null,
  bhk_type         text,
  built_up_area    integer,
  carpet_area      integer,
  floor            integer,
  total_floors     integer,
  facing           text,
  furnishing       text,
  age_of_property  integer,
  bathrooms        integer     default 2,
  balconies        integer     default 0,
  parking          text,
  address          text,
  city             text        not null,
  locality         text        not null,
  state            text,
  pincode          text,
  latitude         double precision,
  longitude        double precision,
  amenities        text[]      default '{}',
  image_urls       text[]      default '{}',
  status           text        not null default 'DRAFT',
  is_verified      boolean     default false,
  rejection_reason text,
  view_count       integer     default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- admin_roles
create table if not exists public.admin_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('reviewer', 'super_admin')),
  created_at timestamptz default now(),
  unique (user_id)
);

-- audit_log
create table if not exists public.audit_log (
  id              uuid        primary key default gen_random_uuid(),
  listing_id      text        not null,
  listing_title   text        not null,
  action          text        not null check (action in (
    'approved', 'rejected', 'note_added', 'status_changed', 'deleted'
  )),
  previous_status text,
  new_status      text,
  actor_id        text        not null,
  actor_role      text        not null default 'reviewer',
  reason          text,
  metadata        jsonb       default '{}',
  created_at      timestamptz default now(),
  entity_type     text        default 'listing',
  entity_id       text,
  previous_value  jsonb,
  new_value       jsonb
);

-- activity_logs
create table if not exists public.activity_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  action      text        not null,
  entity_type text,
  entity_id   text,
  ip_address  text,
  metadata    jsonb       default '{}',
  created_at  timestamptz default now()
);

-- reports
create table if not exists public.reports (
  id                uuid        primary key default gen_random_uuid(),
  reporter_id       uuid        not null references auth.users(id) on delete cascade,
  reporter_role     text        not null check (reporter_role in ('buyer', 'seller')),
  target_user_id    uuid        references auth.users(id) on delete set null,
  target_listing_id uuid        references public.listings(id) on delete set null,
  reason            text        not null,
  details           text,
  status            text        not null default 'OPEN'
                                check (status in ('OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED')),
  reviewed_by       text,
  reviewed_at       timestamptz,
  created_at        timestamptz default now(),
  constraint reports_unique_buyer_listing unique (reporter_id, target_listing_id),
  constraint reports_unique_seller_buyer  unique (reporter_id, target_user_id),
  constraint reports_target_xor check (
    (target_user_id is null) <> (target_listing_id is null)
  )
);

-- blocked_users
create table if not exists public.blocked_users (
  id          uuid        primary key default gen_random_uuid(),
  blocker_id  uuid        not null references auth.users(id) on delete cascade,
  blockee_id  uuid        not null references auth.users(id) on delete cascade,
  reason      text,
  created_at  timestamptz default now(),
  constraint blocked_users_unique unique (blocker_id, blockee_id),
  constraint blocked_users_no_self_block check (blocker_id != blockee_id)
);

-- risk_scores
create table if not exists public.risk_scores (
  user_id          uuid        primary key references auth.users(id) on delete cascade,
  score            integer     not null default 0 check (score >= 0 and score <= 100),
  level            text        not null default 'LOW' check (level in ('LOW', 'MEDIUM', 'HIGH')),
  signals          jsonb       not null default '{}',
  last_computed_at timestamptz default now(),
  created_at       timestamptz default now()
);

-- user_flags
create table if not exists public.user_flags (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  flag        text        not null check (flag in (
    'SPAM', 'BROKER_SUSPECTED', 'NEEDS_REVIEW', 'SUSPENDED', 'CLEARED'
  )),
  reason      text,
  flagged_by  text        not null default 'api_key',
  created_at  timestamptz default now()
);

-- buyer_interest
create table if not exists public.buyer_interest (
  id               uuid                     primary key default gen_random_uuid(),
  listing_id       uuid                     not null references public.listings(id) on delete cascade,
  buyer_id         uuid                     not null references auth.users(id) on delete cascade,
  seller_id        uuid                     not null references auth.users(id) on delete cascade,
  full_name        text                     not null,
  purpose          public.interest_purpose  not null,
  timeline         public.interest_timeline not null,
  funding          public.interest_funding  not null,
  message          text check (char_length(message) <= 250),
  status           public.interest_status   not null default 'PENDING',
  contact_unlocked boolean                  not null default false,
  seller_phone     text,
  seller_email     text,
  buyer_phone      text,
  buyer_email      text,
  created_at       timestamptz              not null default now(),
  updated_at       timestamptz              not null default now()
);

-- payments (listing_id is uuid from the start — no type migration needed in fresh DB)
create table if not exists public.payments (
  id                  uuid        primary key default gen_random_uuid(),
  buyer_id            uuid        not null references auth.users(id) on delete cascade,
  seller_id           uuid        not null references auth.users(id) on delete cascade,
  listing_id          uuid        references public.listings(id) on delete set null,
  interest_id         uuid        not null references public.buyer_interest(id),
  razorpay_order_id   text        unique,
  razorpay_payment_id text        unique,
  status              text        not null default 'PENDING'
                                  check (status in ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  amount              integer     not null default 4900,
  currency            text        not null default 'INR',
  paid_at             timestamptz,
  created_at          timestamptz default now()
);

-- notifications
create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  message     text        not null,
  type        text        not null check (type in (
    'InterestRequest', 'Accepted', 'Rejected',
    'PaymentReceived', 'ConnectionUnlocked', 'System'
  )),
  entity_type text,
  entity_id   text,
  read        boolean     not null default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — COLUMN ADDITIONS (idempotent via ADD COLUMN IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

-- audit_log extended columns (from 005_admin_portal.sql)
alter table public.audit_log
  add column if not exists entity_type    text default 'listing',
  add column if not exists entity_id      text,
  add column if not exists previous_value jsonb,
  add column if not exists new_value      jsonb;

-- buyer_interest contact columns (from 005_payments.sql)
alter table public.buyer_interest
  add column if not exists contact_unlocked boolean not null default false,
  add column if not exists seller_phone     text,
  add column if not exists seller_email     text,
  add column if not exists buyer_phone      text,
  add column if not exists buyer_email      text;

-- listings full-text search vector (from 011)
alter table public.listings
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(locality, '') || ' ' ||
      coalesce(state, '')
    )
  ) stored;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — CONSTRAINTS (idempotent via DO/exception blocks)
-- ─────────────────────────────────────────────────────────────────────────────

-- buyer_not_seller check on buyer_interest
do $$ begin
  alter table public.buyer_interest
    add constraint buyer_not_seller check (buyer_id <> seller_id) not valid;
exception when duplicate_object then null; end $$;

alter table public.buyer_interest validate constraint buyer_not_seller;

-- back-fill audit_log.entity_id from listing_id for rows created before 005_admin_portal
update public.audit_log
  set entity_id = listing_id
  where entity_id is null and listing_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6 — TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

drop trigger if exists buyer_interest_updated_at on public.buyer_interest;
create trigger buyer_interest_updated_at
  before update on public.buyer_interest
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7 — ROW LEVEL SECURITY (enable idempotently, then drop+recreate policies)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.listings        enable row level security;
alter table public.admin_roles     enable row level security;
alter table public.audit_log       enable row level security;
alter table public.activity_logs   enable row level security;
alter table public.reports         enable row level security;
alter table public.blocked_users   enable row level security;
alter table public.risk_scores     enable row level security;
alter table public.user_flags      enable row level security;
alter table public.buyer_interest  enable row level security;
alter table public.payments        enable row level security;
alter table public.notifications   enable row level security;

-- ── listings policies ──────────────────────────────────────────────────────────
drop policy if exists "Public read active listings"       on public.listings;
drop policy if exists "Seller can read own listings"      on public.listings;
drop policy if exists "Seller can insert"                 on public.listings;
drop policy if exists "Seller can update own listings"    on public.listings;
drop policy if exists "Seller can delete own listings"    on public.listings;

create policy "Public read active listings"
  on public.listings for select
  using (status = 'ACTIVE');

create policy "Seller can read own listings"
  on public.listings for select
  using (auth.uid() = seller_id);

-- Tightened: sellers can only create DRAFT or PENDING_REVIEW (003_rls_fixes.sql)
create policy "Seller can insert"
  on public.listings for insert
  with check (
    auth.uid() = seller_id
    and status in ('DRAFT', 'PENDING_REVIEW')
  );

-- Tightened: sellers cannot self-approve to ACTIVE or SOLD
create policy "Seller can update own listings"
  on public.listings for update
  using (auth.uid() = seller_id)
  with check (
    auth.uid() = seller_id
    and status in ('DRAFT', 'PENDING_REVIEW', 'INACTIVE')
  );

create policy "Seller can delete own listings"
  on public.listings for delete
  using (auth.uid() = seller_id and status in ('DRAFT', 'INACTIVE'));

-- ── admin_roles policies ───────────────────────────────────────────────────────
drop policy if exists "Admin roles not publicly readable" on public.admin_roles;

create policy "Admin roles not publicly readable"
  on public.admin_roles for select
  using (false);

-- ── audit_log policies ────────────────────────────────────────────────────────
drop policy if exists "Audit log not publicly readable" on public.audit_log;

create policy "Audit log not publicly readable"
  on public.audit_log for select
  using (false);

-- ── activity_logs policies ────────────────────────────────────────────────────
drop policy if exists "Users read own activity"          on public.activity_logs;
drop policy if exists "No direct activity_log inserts"   on public.activity_logs;
drop policy if exists "No direct activity_log updates"   on public.activity_logs;
drop policy if exists "No direct activity_log deletes"   on public.activity_logs;

create policy "Users read own activity"
  on public.activity_logs for select
  using (auth.uid() = user_id);

create policy "No direct activity_log inserts"
  on public.activity_logs for insert with check (false);

create policy "No direct activity_log updates"
  on public.activity_logs for update using (false);

create policy "No direct activity_log deletes"
  on public.activity_logs for delete using (false);

-- ── reports policies ──────────────────────────────────────────────────────────
drop policy if exists "Reporters read own reports" on public.reports;

create policy "Reporters read own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- ── blocked_users policies ────────────────────────────────────────────────────
drop policy if exists "Users read own blocks"   on public.blocked_users;
drop policy if exists "Users create own blocks" on public.blocked_users;
drop policy if exists "Users delete own blocks" on public.blocked_users;

create policy "Users read own blocks"
  on public.blocked_users for select
  using (auth.uid() = blocker_id);

create policy "Users create own blocks"
  on public.blocked_users for insert
  with check (auth.uid() = blocker_id);

create policy "Users delete own blocks"
  on public.blocked_users for delete
  using (auth.uid() = blocker_id);

-- ── buyer_interest policies ───────────────────────────────────────────────────
drop policy if exists "Buyer can read own interests"              on public.buyer_interest;
drop policy if exists "Seller can read interests on own listings" on public.buyer_interest;
drop policy if exists "Buyer can insert interest"                 on public.buyer_interest;
drop policy if exists "Buyer can withdraw own interest"           on public.buyer_interest;

create policy "Buyer can read own interests"
  on public.buyer_interest for select
  using (auth.uid() = buyer_id);

create policy "Seller can read interests on own listings"
  on public.buyer_interest for select
  using (auth.uid() = seller_id);

create policy "Buyer can insert interest"
  on public.buyer_interest for insert
  with check (
    auth.uid() = buyer_id
    and status = 'PENDING'
  );

create policy "Buyer can withdraw own interest"
  on public.buyer_interest for update
  using (auth.uid() = buyer_id and status = 'PENDING')
  with check (auth.uid() = buyer_id and status = 'WITHDRAWN');

-- ── payments policies ─────────────────────────────────────────────────────────
drop policy if exists "Buyer reads own payments"       on public.payments;
drop policy if exists "No direct payment mutations"    on public.payments;
drop policy if exists "No direct payment deletes"      on public.payments;

create policy "Buyer reads own payments"
  on public.payments for select
  using (auth.uid() = buyer_id);

create policy "No direct payment mutations"
  on public.payments for update
  using (false);

create policy "No direct payment deletes"
  on public.payments for delete
  using (false);

-- ── notifications policies ────────────────────────────────────────────────────
drop policy if exists "Users read own notifications"    on public.notifications;
drop policy if exists "Users update own notifications"  on public.notifications;
drop policy if exists "No direct notification inserts"  on public.notifications;
drop policy if exists "No direct notification deletes"  on public.notifications;

create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "No direct notification inserts"
  on public.notifications for insert with check (false);

create policy "No direct notification deletes"
  on public.notifications for delete using (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8 — INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- audit_log
create index if not exists audit_log_listing_id_idx  on public.audit_log (listing_id);
create index if not exists audit_log_created_at_idx  on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx      on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_action_ts_idx   on public.audit_log (action, created_at desc);

-- activity_logs
create index if not exists activity_logs_user_action_idx
  on public.activity_logs(user_id, action, created_at desc);
create index if not exists activity_logs_entity_idx
  on public.activity_logs(entity_type, entity_id, created_at desc);

-- reports
create index if not exists reports_target_user_idx    on public.reports(target_user_id, created_at desc);
create index if not exists reports_target_listing_idx on public.reports(target_listing_id, created_at desc);
create index if not exists reports_status_idx         on public.reports(status, created_at desc);
create index if not exists reports_open_idx           on public.reports(created_at desc) where (status = 'OPEN');
create index if not exists reports_reporter_idx       on public.reports(reporter_id, created_at desc);

-- blocked_users
create index if not exists blocked_users_blocker_idx on public.blocked_users(blocker_id);
create index if not exists blocked_users_blockee_idx on public.blocked_users(blockee_id);

-- user_flags
create index if not exists user_flags_user_idx on public.user_flags(user_id, created_at desc);

-- buyer_interest
drop index if exists public.buyer_interest_one_pending_idx;
create unique index if not exists buyer_interest_one_pending_idx
  on public.buyer_interest (listing_id, buyer_id) where status = 'PENDING';

create index if not exists buyer_interest_buyer_idx   on public.buyer_interest (buyer_id);
create index if not exists buyer_interest_listing_idx on public.buyer_interest (listing_id);
create index if not exists buyer_interest_seller_idx  on public.buyer_interest (seller_id);
create index if not exists buyer_interest_status_idx  on public.buyer_interest (status);
create index if not exists buyer_interest_pending_idx
  on public.buyer_interest (listing_id, buyer_id) where (status = 'PENDING');

-- payments
create unique index if not exists payments_interest_success_idx
  on public.payments(interest_id) where (status = 'SUCCESS');

create index if not exists payments_buyer_id_idx      on public.payments (buyer_id);
create index if not exists payments_interest_id_idx   on public.payments (interest_id);
create index if not exists payments_order_id_idx      on public.payments (razorpay_order_id);
create index if not exists payments_seller_id_idx     on public.payments (seller_id);
create index if not exists payments_buyer_status_idx  on public.payments (buyer_id, status);
create index if not exists payments_status_created_at_idx on public.payments (status, created_at desc);

-- listings
create index if not exists listings_status_created_at_idx on public.listings (status, created_at desc);
create index if not exists listings_seller_id_idx         on public.listings (seller_id);
create index if not exists listings_city_idx              on public.listings (city);
create index if not exists listings_status_price_idx      on public.listings (status, price);
create index if not exists listings_property_type_idx     on public.listings (property_type);
create index if not exists listings_bhk_type_idx          on public.listings (bhk_type);
create index if not exists listings_search_vector_idx     on public.listings using gin (search_vector);
create index if not exists listings_active_created_at_idx on public.listings (created_at desc) where (status = 'ACTIVE');
create index if not exists listings_active_price_idx      on public.listings (price) where (status = 'ACTIVE');

-- notifications
create index if not exists notifications_user_recent_idx
  on public.notifications(user_id, created_at desc) where (read = false);
create index if not exists notifications_user_all_idx
  on public.notifications (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9 — VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.latest_user_flag as
  select distinct on (user_id)
    user_id, flag, reason, flagged_by, created_at
  from public.user_flags
  order by user_id, created_at desc;

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

create or replace view public.pending_per_listing as
  select
    listing_id,
    count(*)::integer as pending_count
  from public.buyer_interest
  where status = 'PENDING'
  group by listing_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10 — REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

-- Enables Realtime for the notifications bell icon.
-- ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS syntax in Postgres.
-- Wrap in a DO block to swallow error 42710 (duplicate_object) on re-run.
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

-- =============================================================================
-- DONE. All tables, policies, indexes, triggers, and views are now in place.
-- =============================================================================
