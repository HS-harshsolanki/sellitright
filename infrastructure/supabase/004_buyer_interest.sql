-- Run after 003_rls_fixes.sql
-- Creates the buyer_interest table for the Handshake Model.

create type public.interest_purpose   as enum ('SELF', 'INVESTMENT');
create type public.interest_timeline  as enum ('IMMEDIATELY', 'WITHIN_30_DAYS', 'ONE_TO_THREE_MONTHS', 'EXPLORING');
create type public.interest_funding   as enum ('CASH_READY', 'LOAN_APPROVED', 'LOAN_IN_PROGRESS');
create type public.interest_status    as enum ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

create table public.buyer_interest (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  buyer_id      uuid not null references auth.users(id) on delete cascade,
  seller_id     uuid not null references auth.users(id) on delete cascade,
  full_name     text not null,
  purpose       public.interest_purpose   not null,
  timeline      public.interest_timeline  not null,
  funding       public.interest_funding   not null,
  message       text check (char_length(message) <= 250),
  status        public.interest_status not null default 'PENDING',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Partial unique index: only one PENDING request per (listing, buyer) at a time
-- This covers the acceptance criteria: buyer can submit exactly one pending request per property.
drop index if exists public.buyer_interest_one_pending_idx;
create unique index buyer_interest_one_pending_idx
  on public.buyer_interest (listing_id, buyer_id)
  where status = 'PENDING';

-- Auto-update updated_at
create trigger buyer_interest_updated_at
  before update on public.buyer_interest
  for each row execute function public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.buyer_interest enable row level security;

-- Buyers can see their own requests
create policy "Buyer can read own interests"
  on public.buyer_interest for select
  using (auth.uid() = buyer_id);

-- Sellers can see requests on their listings
create policy "Seller can read interests on own listings"
  on public.buyer_interest for select
  using (auth.uid() = seller_id);

-- Buyers can insert their own request (status must be PENDING)
create policy "Buyer can insert interest"
  on public.buyer_interest for insert
  with check (
    auth.uid() = buyer_id
    and status = 'PENDING'
  );

-- Buyers can withdraw their own pending request
create policy "Buyer can withdraw own interest"
  on public.buyer_interest for update
  using (auth.uid() = buyer_id and status = 'PENDING')
  with check (auth.uid() = buyer_id and status = 'WITHDRAWN');

-- Seller cannot be the buyer on the same listing
-- (enforced at API level via seller_id check)

-- Index for query performance
create index buyer_interest_buyer_idx   on public.buyer_interest (buyer_id);
create index buyer_interest_listing_idx on public.buyer_interest (listing_id);
create index buyer_interest_seller_idx  on public.buyer_interest (seller_id);
create index buyer_interest_status_idx  on public.buyer_interest (status);
