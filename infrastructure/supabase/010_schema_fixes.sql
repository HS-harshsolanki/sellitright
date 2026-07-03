-- 010_schema_fixes.sql
-- Resolves S1, S2, S4 from the Sprint 6 audit.
-- Run AFTER 009_payments_listing_fk.sql.

-- ── S1: Fix reports.target_listing_id type and add FK ─────────────────────────
-- The column was text; listings.id is uuid. Cast and add FK with SET NULL on delete
-- so reports survive if a listing is removed.

alter table public.reports
  alter column target_listing_id type uuid
    using target_listing_id::uuid;

alter table public.reports
  add constraint reports_target_listing_id_fkey
    foreign key (target_listing_id)
    references public.listings(id)
    on delete set null;

-- ── S2: Add ON DELETE CASCADE to payments_listing_id_fkey ─────────────────────
-- The FK was created in 009 without cascade. Hard-deleting a listing would block
-- because FK enforcement prevents orphaned payment rows. Drop and recreate.

alter table public.payments
  drop constraint if exists payments_listing_id_fkey;

alter table public.payments
  add constraint payments_listing_id_fkey
    foreign key (listing_id)
    references public.listings(id)
    on delete set null;

-- ── S4: Deny INSERT/UPDATE/DELETE on activity_logs ────────────────────────────
-- Only SELECT policy existed. Authenticated users could forge activity records.

create policy "No direct activity_log inserts"
  on public.activity_logs for insert with check (false);

create policy "No direct activity_log updates"
  on public.activity_logs for update using (false);

create policy "No direct activity_log deletes"
  on public.activity_logs for delete using (false);
