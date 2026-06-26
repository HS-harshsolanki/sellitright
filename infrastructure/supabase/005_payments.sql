-- Migration 002: Payment flow for contact unlock
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → Run)
--
-- Creates:
--   • payments table
--   • Unique partial index to prevent double-charge
--   • RLS policy so buyers can read their own payment records
--   • New columns on buyer_interest for contact unlock state

-- ── payments table ────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id                  uuid        primary key default gen_random_uuid(),
  buyer_id            uuid        not null references auth.users(id),
  seller_id           uuid        not null references auth.users(id),
  listing_id          text        not null,
  interest_id         uuid        not null references public.buyer_interest(id),
  razorpay_order_id   text        unique,
  razorpay_payment_id text        unique,
  status              text        not null default 'PENDING'
                                  check (status in ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  amount              integer     not null default 4900,  -- in paise (₹49.00)
  currency            text        not null default 'INR',
  paid_at             timestamptz,
  created_at          timestamptz default now()
);

-- Prevent a buyer from paying twice for the same accepted interest
create unique index if not exists payments_interest_success_idx
  on public.payments(interest_id)
  where (status = 'SUCCESS');

-- Row Level Security — buyers can only read their own payment records
alter table public.payments enable row level security;

create policy "Buyer reads own payments"
  on public.payments
  for select
  using (auth.uid() = buyer_id);

-- ── buyer_interest additions ──────────────────────────────────────────────────
-- contact_unlocked: flips to true after successful payment
-- seller_phone / seller_email: written at verify time, revealed to buyer
-- buyer_phone / buyer_email: written at verify time, revealed to seller

alter table public.buyer_interest
  add column if not exists contact_unlocked boolean not null default false,
  add column if not exists seller_phone     text,
  add column if not exists seller_email     text,
  add column if not exists buyer_phone      text,
  add column if not exists buyer_email      text;
