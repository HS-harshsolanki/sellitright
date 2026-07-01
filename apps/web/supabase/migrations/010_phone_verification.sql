-- 010_phone_verification.sql
-- WhatsApp OTP verification: stores OTP requests for phone verification.
-- Service role only — no direct client access.

CREATE TABLE IF NOT EXISTS public.phone_otp_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       text        NOT NULL,            -- normalized 10-digit Indian number
  otp_hash    text        NOT NULL,            -- HMAC-SHA256(otp:phone:userId, secret)
  attempts    int         NOT NULL DEFAULT 0,  -- failed verify attempts; max 5
  expires_at  timestamptz NOT NULL,
  used        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- All access goes through service role in API routes — clients never touch this table
ALTER TABLE public.phone_otp_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to OTP requests"
  ON public.phone_otp_requests
  USING (false)
  WITH CHECK (false);

-- Rate-limit query: count recent OTPs per phone
CREATE INDEX IF NOT EXISTS phone_otp_phone_created_idx
  ON public.phone_otp_requests (phone, created_at DESC);

-- Cleanup query: find valid unused OTPs for a user+phone
CREATE INDEX IF NOT EXISTS phone_otp_user_phone_idx
  ON public.phone_otp_requests (user_id, phone, used, expires_at);

-- Periodic cleanup support (run via cron or pg_cron)
-- DELETE FROM public.phone_otp_requests WHERE expires_at < now() - interval '1 hour';
