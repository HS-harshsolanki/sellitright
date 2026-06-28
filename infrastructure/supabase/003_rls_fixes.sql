-- Run in Supabase SQL Editor after 001_listings.sql and 002_admin.sql
-- Tightens RLS: sellers can only insert listings with status DRAFT or PENDING_REVIEW
-- This prevents a crafted API call from bypassing the review queue

-- Drop the existing open insert policy
drop policy if exists "Seller can insert" on public.listings;

-- Recreate with status constraint — sellers can only start as DRAFT or PENDING_REVIEW
create policy "Seller can insert"
  on public.listings for insert
  with check (
    auth.uid() = seller_id
    and status in ('DRAFT', 'PENDING_REVIEW')
  );

-- Also tighten UPDATE — sellers cannot change status to ACTIVE or SOLD themselves
-- (admin uses service key which bypasses RLS, so this doesn't affect admin routes)
drop policy if exists "Seller can update own listings" on public.listings;

create policy "Seller can update own listings"
  on public.listings for update
  using (auth.uid() = seller_id)
  with check (
    auth.uid() = seller_id
    and status in ('DRAFT', 'PENDING_REVIEW', 'INACTIVE')
  );
