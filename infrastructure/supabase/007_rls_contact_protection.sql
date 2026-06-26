-- 007_rls_contact_protection.sql
-- Add DB-level constraint: buyer cannot equal seller on same interest row

alter table public.buyer_interest
  add constraint buyer_not_seller check (buyer_id <> seller_id);
