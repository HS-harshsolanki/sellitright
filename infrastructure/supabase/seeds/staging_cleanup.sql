-- =============================================================================
-- staging_cleanup.sql
-- Removes all seed data inserted by staging_seed.sql.
-- All seed rows use UUIDs prefixed with '00000000-seed-' making them
-- trivially identifiable and deletable without touching real data.
--
-- Safe to run on an empty database (returns 0 rows deleted, no errors).
-- Deletes in reverse dependency order to respect foreign key constraints.
--
-- Usage:
--   Supabase SQL Editor → paste and run
--   OR: supabase db execute --project-ref <ref> < infrastructure/supabase/seeds/staging_cleanup.sql
-- =============================================================================

DO $$
DECLARE
  v_notifications   int;
  v_messages        int;
  v_threads         int;
  v_payments        int;
  v_interests       int;
  v_listings        int;
  v_profiles        int;
  v_auth_users      int;
BEGIN

  -- 1. Notifications
  DELETE FROM public.notifications
    WHERE id::text LIKE '00000000-seed%';
  GET DIAGNOSTICS v_notifications = ROW_COUNT;

  -- 2. Chat messages
  DELETE FROM public.chat_messages
    WHERE id::text LIKE '00000000-seed%';
  GET DIAGNOSTICS v_messages = ROW_COUNT;

  -- 3. Chat threads
  DELETE FROM public.chat_threads
    WHERE id::text LIKE '00000000-seed%';
  GET DIAGNOSTICS v_threads = ROW_COUNT;

  -- 4. Payments (before buyer_interest because of FK on interest_id)
  DELETE FROM public.payments
    WHERE id::text LIKE '00000000-seed%';
  GET DIAGNOSTICS v_payments = ROW_COUNT;

  -- 5. Buyer interest
  DELETE FROM public.buyer_interest
    WHERE id::text LIKE '00000000-seed%';
  GET DIAGNOSTICS v_interests = ROW_COUNT;

  -- 6. Listings
  DELETE FROM public.listings
    WHERE id::text LIKE '00000000-seed%';
  GET DIAGNOSTICS v_listings = ROW_COUNT;

  -- 7. Profiles
  DELETE FROM public.profiles
    WHERE id::text LIKE '00000000-seed%';
  GET DIAGNOSTICS v_profiles = ROW_COUNT;

  -- 8. Auth users (cascades remaining FK references automatically)
  DELETE FROM auth.users
    WHERE id::text LIKE '00000000-seed%';
  GET DIAGNOSTICS v_auth_users = ROW_COUNT;

  RAISE NOTICE '──────────────────────────────────────────';
  RAISE NOTICE 'Staging seed cleanup complete.';
  RAISE NOTICE '  notifications  deleted: %', v_notifications;
  RAISE NOTICE '  chat_messages  deleted: %', v_messages;
  RAISE NOTICE '  chat_threads   deleted: %', v_threads;
  RAISE NOTICE '  payments       deleted: %', v_payments;
  RAISE NOTICE '  buyer_interest deleted: %', v_interests;
  RAISE NOTICE '  listings       deleted: %', v_listings;
  RAISE NOTICE '  profiles       deleted: %', v_profiles;
  RAISE NOTICE '  auth.users     deleted: %', v_auth_users;
  RAISE NOTICE '──────────────────────────────────────────';

END $$;
