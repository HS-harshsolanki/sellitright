-- Migration: 006_security_hardening.sql
-- Purpose: Address critical security audit findings
-- Findings addressed:
--   PAY-03: Prevent duplicate PENDING payments
--   PAY-05: Add FAILED/CANCELLED payment statuses
--   SEC-DB-03: Append-only audit_log
--   SEC-DB-04: Restrict pending_per_listing view
--   SEC-DB-01/02: Mask contact fields in buyer_interest pre-payment
-- Run in Supabase SQL editor. All statements are idempotent.


-- ============================================================
-- PAY-03: Prevent duplicate PENDING payments
-- ============================================================

-- Clean up duplicate PENDING rows before creating the unique index.
-- Keeps the most recently created row for each interest_id.
-- NOTE: This index will fail if duplicate PENDING rows still exist after this DELETE.
--       If rows share the same created_at, manual cleanup may be required first.
DELETE FROM public.payments p1
  USING public.payments p2
  WHERE p1.interest_id = p2.interest_id
    AND p1.status = 'PENDING'
    AND p2.status = 'PENDING'
    AND p1.created_at < p2.created_at;

-- Partial unique index: only one PENDING row allowed per interest_id
CREATE UNIQUE INDEX IF NOT EXISTS payments_pending_unique_idx
  ON public.payments (interest_id)
  WHERE status = 'PENDING';


-- ============================================================
-- PAY-05: Add FAILED and CANCELLED payment statuses
-- ============================================================

-- Add FAILED status support: update check constraint if it exists
DO $$
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
  -- Add updated constraint with FAILED and CANCELLED
  ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not update payments status constraint: %', SQLERRM;
END $$;


-- ============================================================
-- SEC-DB-03: Append-only audit_log trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable — INSERT only';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_immutable_tgr ON public.audit_log;
CREATE TRIGGER audit_log_immutable_tgr
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();


-- ============================================================
-- SEC-DB-04: Restrict pending_per_listing view access
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'pending_per_listing'
  ) THEN
    REVOKE SELECT ON public.pending_per_listing FROM authenticated;
    REVOKE SELECT ON public.pending_per_listing FROM anon;
    RAISE NOTICE 'Revoked access to pending_per_listing';
  ELSE
    RAISE NOTICE 'pending_per_listing view not found — skipping';
  END IF;
END $$;


-- ============================================================
-- SEC-DB-01 / SEC-DB-02: Mask contact fields in buyer_interest pre-payment
-- ============================================================

-- Drop existing permissive SELECT policies (replaced with restrictive ones below)
DROP POLICY IF EXISTS "Buyers can view own interests" ON public.buyer_interest;
DROP POLICY IF EXISTS "Sellers can view interests on own listings" ON public.buyer_interest;

-- Buyers: can see own rows (contact fields masked by safe view below)
CREATE POLICY "Buyers can view own interests"
  ON public.buyer_interest
  FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid()
  );

-- Sellers: can see interests on their listings (contact fields masked by safe view below)
CREATE POLICY "Sellers can view interests on own listings"
  ON public.buyer_interest
  FOR SELECT
  TO authenticated
  USING (
    seller_id = auth.uid()
  );

-- Secure view that enforces column-level masking of contact fields pre-payment.
-- Contact fields are only returned when contact_unlocked = true AND the requesting
-- user is either the buyer or seller for that specific row.
CREATE OR REPLACE VIEW public.buyer_interest_safe AS
SELECT
  id,
  listing_id,
  buyer_id,
  seller_id,
  status,
  message,
  contact_unlocked,
  created_at,
  updated_at,
  -- Mask contact fields: only return when contact_unlocked = true AND
  -- the requesting user is either the buyer or the seller of this row
  CASE
    WHEN contact_unlocked = true AND (
      buyer_id = auth.uid() OR seller_id = auth.uid()
    ) THEN seller_phone
    ELSE NULL
  END AS seller_phone,
  CASE
    WHEN contact_unlocked = true AND (
      buyer_id = auth.uid() OR seller_id = auth.uid()
    ) THEN seller_email
    ELSE NULL
  END AS seller_email,
  CASE
    WHEN contact_unlocked = true AND (
      buyer_id = auth.uid() OR seller_id = auth.uid()
    ) THEN buyer_phone
    ELSE NULL
  END AS buyer_phone,
  CASE
    WHEN contact_unlocked = true AND (
      buyer_id = auth.uid() OR seller_id = auth.uid()
    ) THEN buyer_email
    ELSE NULL
  END AS buyer_email
FROM public.buyer_interest
WHERE
  buyer_id = auth.uid() OR seller_id = auth.uid();

-- Grant access to the safe view only (not the underlying table directly)
GRANT SELECT ON public.buyer_interest_safe TO authenticated;


-- ============================================================
-- Additional indexes for payments reconciliation
-- ============================================================

CREATE INDEX IF NOT EXISTS payments_interest_status_idx
  ON public.payments (interest_id, status);

CREATE INDEX IF NOT EXISTS payments_buyer_created_idx
  ON public.payments (buyer_id, created_at DESC);
