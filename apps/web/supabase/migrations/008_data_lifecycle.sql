-- Activity log retention: prune rows older than 90 days
-- Run this manually or via pg_cron if available
CREATE OR REPLACE FUNCTION public.prune_old_activity_logs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Notifications retention: prune rows older than 6 months
CREATE OR REPLACE FUNCTION public.prune_old_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < now() - interval '6 months';
END;
$$;

-- Index for retention queries (if not already present)
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
  ON public.activity_logs (created_at ASC);

CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON public.notifications (created_at ASC);

-- Index for IP-based broker detection
CREATE INDEX IF NOT EXISTS activity_logs_ip_idx
  ON public.activity_logs (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;

-- Schedule purge via pg_cron (requires pg_cron extension — safe to run even if not available)
DO $$ BEGIN
  PERFORM cron.schedule(
    'prune-activity-logs',
    '0 3 * * *',
    $$SELECT public.prune_old_activity_logs()$$
  );
EXCEPTION WHEN undefined_function THEN
  -- pg_cron not available; run prune functions manually
  NULL;
END $$;

DO $$ BEGIN
  PERFORM cron.schedule(
    'prune-notifications',
    '0 4 * * *',
    $$SELECT public.prune_old_notifications()$$
  );
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;
