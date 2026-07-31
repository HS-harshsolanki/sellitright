-- applied to production: YES
-- Tracks brute-force attempts per OTP row; used by verify-otp to lock out after 5 failures
ALTER TABLE phone_otp_requests
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
