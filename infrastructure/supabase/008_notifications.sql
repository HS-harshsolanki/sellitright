-- 008_notifications.sql
-- Notifications sent to users on key events (interest, payment, connection)

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  message      text not null,
  type         text not null check (type in (
                 'InterestRequest', 'Accepted', 'Rejected',
                 'PaymentReceived', 'ConnectionUnlocked', 'System'
               )),
  entity_type  text,
  entity_id    text,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Users can only read their own notifications
alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Service role (used by API routes) can insert — no policy needed for INSERT
-- because RLS policies default-deny INSERT, and service role bypasses RLS

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_created_at_idx on public.notifications (created_at desc);
