-- Run in Supabase SQL Editor after 001_listings.sql

-- ── admin_roles table ─────────────────────────────────────────────────────────
-- Maps a Supabase auth user to an admin role.
-- Roles: 'reviewer' (approve/reject, notes) | 'super_admin' (full access)
create table if not exists public.admin_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('reviewer', 'super_admin')),
  created_at timestamptz default now(),
  unique (user_id)
);

alter table public.admin_roles enable row level security;

-- Only super_admins can read/manage roles (enforced at API layer via service key)
create policy "Admin roles not publicly readable"
  on public.admin_roles for select
  using (false);

-- ── audit_log table ───────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  listing_id      text not null,          -- UUID or mock ID
  listing_title   text not null,
  action          text not null check (action in ('approved', 'rejected', 'note_added', 'status_changed')),
  previous_status text,
  new_status      text,
  actor_id        text not null,          -- admin identifier (user id or 'api_key')
  actor_role      text not null default 'reviewer',
  reason          text,                   -- rejection reason or note text
  metadata        jsonb default '{}',
  created_at      timestamptz default now()
);

alter table public.audit_log enable row level security;

-- Only accessible via service role (admin API routes use service key)
create policy "Audit log not publicly readable"
  on public.audit_log for select
  using (false);

-- Index for fast listing history lookups
create index if not exists audit_log_listing_id_idx on public.audit_log (listing_id);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

-- ── RLS policy: admin service role can update listing status ──────────────────
-- The admin API uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely,
-- so no additional policy is needed. This comment documents the intent.
