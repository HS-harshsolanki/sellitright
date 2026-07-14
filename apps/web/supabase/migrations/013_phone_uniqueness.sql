-- 013_phone_uniqueness.sql
-- applied to production: NO
--
-- Enforce one verified phone per account.
-- Phone is written to auth.users.raw_user_meta_data by the verify-otp API.
-- We mirror it to public.profiles so we can add a standard UNIQUE constraint.

-- Step 1: Add phone columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- Step 2: Backfill existing verified users from auth metadata
UPDATE public.profiles p
SET
  phone          = u.raw_user_meta_data->>'phone',
  phone_verified = true
FROM auth.users u
WHERE p.id = u.id
  AND (u.raw_user_meta_data->>'phone_verified')::boolean = true
  AND u.raw_user_meta_data->>'phone' IS NOT NULL;

-- Step 3: Partial UNIQUE index — only one account may hold a given verified phone.
-- NULL / unverified phones are excluded so in-progress verifications don't block each other.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_verified_phone_unique_idx
  ON public.profiles (phone)
  WHERE phone_verified = true;

-- Fast lookup index used by the uniqueness check in the verify-otp API
CREATE INDEX IF NOT EXISTS profiles_phone_lookup_idx
  ON public.profiles (phone)
  WHERE phone_verified = true;

-- Step 4: Update handle_user_update trigger to sync phone fields whenever
-- auth.users metadata changes (e.g. after verify-otp writes phone_verified: true).
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET
    email          = NEW.email,
    full_name      = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', full_name),
    avatar_url     = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
    phone          = CASE
                       WHEN (NEW.raw_user_meta_data->>'phone_verified')::boolean = true
                         THEN NEW.raw_user_meta_data->>'phone'
                       ELSE NULL
                     END,
    phone_verified = COALESCE((NEW.raw_user_meta_data->>'phone_verified')::boolean, false),
    updated_at     = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
