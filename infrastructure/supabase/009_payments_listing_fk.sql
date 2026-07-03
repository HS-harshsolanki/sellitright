-- 009_payments_listing_fk.sql
-- Fix listing_id column type (text → uuid) and add missing FK + cascade rules.
-- Run AFTER 005_payments.sql.

-- Fix listing_id type and add FK constraint
alter table public.payments
  alter column listing_id type uuid using listing_id::uuid;

alter table public.payments
  add constraint payments_listing_id_fkey
    foreign key (listing_id) references public.listings(id);

-- Add ON DELETE CASCADE to buyer/seller FKs (currently missing cascade)
alter table public.payments
  drop constraint if exists payments_buyer_id_fkey,
  add constraint payments_buyer_id_fkey
    foreign key (buyer_id) references auth.users(id) on delete cascade;

alter table public.payments
  drop constraint if exists payments_seller_id_fkey,
  add constraint payments_seller_id_fkey
    foreign key (seller_id) references auth.users(id) on delete cascade;
