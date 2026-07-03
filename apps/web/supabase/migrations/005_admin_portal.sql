-- Extend audit_log to support non-listing entity types
-- (users, reports, payments) and store before/after values.

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS entity_type    text DEFAULT 'listing',
  ADD COLUMN IF NOT EXISTS entity_id      text,
  ADD COLUMN IF NOT EXISTS previous_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value      jsonb;

-- Back-fill entity_id from listing_id for existing rows
UPDATE public.audit_log
  SET entity_id = listing_id
  WHERE entity_id IS NULL AND listing_id IS NOT NULL;

-- Indexes for fast admin queries
CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON public.audit_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS audit_log_action_ts_idx
  ON public.audit_log(action, created_at DESC);
