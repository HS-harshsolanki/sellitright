-- CANONICAL: This is the authoritative notifications table migration.
-- infrastructure/supabase/008_notifications.sql redirects here.
-- Run order: after 002_payments.sql

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  message     text not null,
  type        text not null
              check (type in ('InterestRequest','Accepted','Rejected',
                              'PaymentReceived','ConnectionUnlocked','System')),
  entity_type text,
  entity_id   text,
  read        boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists notifications_user_recent_idx
  on public.notifications(user_id, created_at desc)
  where (read = false);

alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

create policy "No direct notification inserts"
  on public.notifications for insert with check (false);

create policy "No direct notification deletes"
  on public.notifications for delete using (false);
