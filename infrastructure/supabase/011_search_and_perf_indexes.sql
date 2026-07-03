-- 011_search_and_perf_indexes.sql
-- P3: Full-text search vector + GIN index replacing ILIKE sequential scan.
-- M3: Partial index for ACTIVE listings (hot browse path).
-- M4: Full notifications index (covers all-notifications path, not just unread partial).
-- L2: Partial index on buyer_interest for PENDING status.
-- L4/L5: Additional payments indexes.
-- L9/L10: Partial/reporter indexes on reports.
-- Run AFTER 010_schema_fixes.sql.

-- ── P3: Full-text search on listings ─────────────────────────────────────────
-- Generated stored column so the vector is kept current on every INSERT/UPDATE.
-- Uses 'simple' config (no language stemming) so city names like "Koramangala"
-- match exactly rather than being stemmed away.

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

create index if not exists listings_search_vector_idx
  on public.listings using gin (search_vector);

-- ── M3: Partial index for the hot ACTIVE browse path ─────────────────────────
-- Replaces the full listings_status_created_at_idx for the most common query
-- pattern. DRAFT/PENDING/SOLD/INACTIVE rows no longer pollute this index.

create index if not exists listings_active_created_at_idx
  on public.listings (created_at desc)
  where (status = 'ACTIVE');

create index if not exists listings_active_price_idx
  on public.listings (price)
  where (status = 'ACTIVE');

-- ── M4: Full notifications index (all-history query path) ─────────────────────
-- The existing partial index (where read = false) misses full-history loads.

create index if not exists notifications_user_all_idx
  on public.notifications (user_id, created_at desc);

-- ── L2: Buyer interest partial index on PENDING status ───────────────────────

create index if not exists buyer_interest_pending_idx
  on public.buyer_interest (listing_id, buyer_id)
  where (status = 'PENDING');

-- ── L4: Payments (buyer_id, status) composite ────────────────────────────────

create index if not exists payments_buyer_status_idx
  on public.payments (buyer_id, status);

-- ── L5: Payments (status, created_at) for admin status filter ────────────────

create index if not exists payments_status_created_at_idx
  on public.payments (status, created_at desc);

-- ── L9: Partial index on open reports ────────────────────────────────────────

create index if not exists reports_open_idx
  on public.reports (created_at desc)
  where (status = 'OPEN');

-- ── L10: Reporter index for RLS policy and user-facing query ─────────────────

create index if not exists reports_reporter_idx
  on public.reports (reporter_id, created_at desc);
