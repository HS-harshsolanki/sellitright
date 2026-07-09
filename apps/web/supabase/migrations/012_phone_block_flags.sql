-- Phone block flags: tracks users auto-blocked after 3 phone-sharing violations in chat.
-- Written only by the service-role API; no direct client access.

CREATE TABLE IF NOT EXISTS public.phone_block_flags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active  boolean     NOT NULL DEFAULT true,
  reason     text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_block_flags_user_id_idx ON public.phone_block_flags (user_id, is_active);

ALTER TABLE public.phone_block_flags ENABLE ROW LEVEL SECURITY;

-- No direct client access — service role only
CREATE POLICY "No client access to phone_block_flags"
  ON public.phone_block_flags
  AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);
