-- Migration 004: Enable Realtime on the notifications table
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → Run)
--
-- Without this, Supabase Realtime does not broadcast INSERT/UPDATE events for
-- the notifications table, so client-side subscriptions receive nothing.
--
-- Also adds an INSERT RLS policy so the service-role client can write rows
-- (the existing table only has SELECT + UPDATE policies — INSERT was missing).

-- ── Enable Realtime publication ───────────────────────────────────────────────

alter publication supabase_realtime add table public.notifications;

-- INSERT policy intentionally omitted.
-- The service-role client bypasses RLS entirely and does not need an explicit
-- INSERT policy. Adding WITH CHECK (true) for the authenticated role would
-- allow any logged-in user to insert notifications for arbitrary user_ids.
-- Default-deny (no INSERT policy) is the correct posture here.
