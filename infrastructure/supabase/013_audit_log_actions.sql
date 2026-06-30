-- Migration 013: Expand audit_log.action CHECK constraint
-- Adds 'user_flagged' and 'reports_bulk_updated' which are emitted by admin
-- flag and reports routes but were absent from the original constraint, causing
-- those audit entries to be silently dropped by Postgres.

alter table public.audit_log
  drop constraint if exists audit_log_action_check;

alter table public.audit_log
  add constraint audit_log_action_check check (action in (
    'approved',
    'rejected',
    'note_added',
    'status_changed',
    'deleted',
    'user_flagged',
    'reports_bulk_updated'
  ));
