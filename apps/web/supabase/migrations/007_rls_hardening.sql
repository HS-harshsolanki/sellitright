-- Prevent authenticated users from directly inserting into audit_log
-- (all legitimate inserts happen via service role which bypasses RLS)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'No direct audit_log inserts'
  ) THEN
    EXECUTE 'CREATE POLICY "No direct audit_log inserts" ON public.audit_log FOR INSERT WITH CHECK (false)';
  END IF;
END $$;

-- Allow sellers to accept or decline their own PENDING interests
-- (previously required service role workaround)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'buyer_interest' AND policyname = 'Seller can accept or decline pending interest'
  ) THEN
    EXECUTE 'CREATE POLICY "Seller can accept or decline pending interest" ON public.buyer_interest
      FOR UPDATE
      USING (auth.uid() = seller_id AND status = ''PENDING'')
      WITH CHECK (auth.uid() = seller_id AND status IN (''ACCEPTED'', ''DECLINED''))';
  END IF;
END $$;

-- Explicit deny-all for risk_scores and user_flags to prevent accidental anon access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'risk_scores' AND policyname = 'No public access to risk_scores'
  ) THEN
    EXECUTE 'CREATE POLICY "No public access to risk_scores" ON public.risk_scores FOR ALL USING (false)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_flags' AND policyname = 'No public access to user_flags'
  ) THEN
    EXECUTE 'CREATE POLICY "No public access to user_flags" ON public.user_flags FOR ALL USING (false)';
  END IF;
END $$;
