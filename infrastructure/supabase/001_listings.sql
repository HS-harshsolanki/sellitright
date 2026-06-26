-- Run this in Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → paste & run

-- ── listings table ───────────────────────────────────────────────────────────
create table if not exists public.listings (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid not null references auth.users(id) on delete cascade,

  -- core fields
  title            text not null,
  description      text not null,
  price            bigint not null,          -- in rupees (not paise)
  property_type    text not null,            -- APARTMENT | VILLA | PLOT | INDEPENDENT_HOUSE | PENTHOUSE
  bhk_type         text,                     -- ONE_BHK … FIVE_PLUS_BHK
  built_up_area    integer,                  -- sq ft
  carpet_area      integer,
  floor            integer,
  total_floors     integer,
  facing           text,
  furnishing       text,                     -- FURNISHED | SEMI_FURNISHED | UNFURNISHED
  age_of_property  integer,
  bathrooms        integer default 2,
  balconies        integer default 0,
  parking          text,                     -- COVERED | OPEN | BOTH | NONE

  -- location
  address          text,
  city             text not null,
  locality         text not null,
  state            text,
  pincode          text,
  latitude         double precision,
  longitude        double precision,

  -- arrays
  amenities        text[] default '{}',
  image_urls       text[] default '{}',

  -- status & meta
  status           text not null default 'DRAFT',   -- DRAFT | PENDING_REVIEW | ACTIVE | REJECTED | SOLD | INACTIVE
  is_verified      boolean default false,
  rejection_reason text,
  view_count       integer default 0,

  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.listings enable row level security;

-- Public can read active listings
create policy "Public read active listings"
  on public.listings for select
  using (status = 'ACTIVE');

-- Sellers can read their own listings (all statuses)
create policy "Seller can read own listings"
  on public.listings for select
  using (auth.uid() = seller_id);

-- Sellers can insert their own listings
create policy "Seller can insert"
  on public.listings for insert
  with check (auth.uid() = seller_id);

-- Sellers can update their own listings (but not change seller_id)
create policy "Seller can update own listings"
  on public.listings for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- Sellers can delete their own drafts / inactive listings
create policy "Seller can delete own listings"
  on public.listings for delete
  using (auth.uid() = seller_id and status in ('DRAFT', 'INACTIVE'));

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();
