-- 011_chat.sql
-- Buyer-seller chat system.
-- Access: chat unlocks when seller accepts interest. Service role only for inserts.

-- ── chat_threads ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id      uuid        NOT NULL UNIQUE REFERENCES public.buyer_interest(id) ON DELETE CASCADE,
  listing_id       text        NOT NULL,
  buyer_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- active: normal; locked: interest withdrawn/listing deleted (read-only); disabled: block
  status           text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'locked', 'disabled')),
  buyer_unread     int         NOT NULL DEFAULT 0,
  seller_unread    int         NOT NULL DEFAULT 0,
  last_message_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_threads_buyer_idx   ON public.chat_threads(buyer_id,  last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS chat_threads_seller_idx  ON public.chat_threads(seller_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS chat_threads_interest_idx ON public.chat_threads(interest_id);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

-- Buyer and seller can read their own threads; inserts/updates via service role only
CREATE POLICY "Thread participants can read"
  ON public.chat_threads FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "No direct client inserts on threads"
  ON public.chat_threads FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct client updates on threads"
  ON public.chat_threads FOR UPDATE
  USING (false);

-- ── chat_messages ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid        NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_deleted  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON public.chat_messages(thread_id, created_at ASC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read messages in their threads
CREATE POLICY "Thread participants can read messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id
        AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
    )
  );

CREATE POLICY "No direct client inserts on messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct client updates on messages"
  ON public.chat_messages FOR UPDATE
  USING (false);

-- ── chat_violations ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_violations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid        NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- never store the raw number, only a sanitised preview for admin review
  content_preview text        NOT NULL,
  offense_number  int         NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_violations_sender_idx ON public.chat_violations(sender_id, created_at DESC);

ALTER TABLE public.chat_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to violations"
  ON public.chat_violations
  USING (false)
  WITH CHECK (false);

-- ── Realtime ──────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;

-- ── Notification type extension ───────────────────────────────────────────────
-- Add NewChatMessage to the notifications type check constraint.
-- We need to drop and recreate the constraint (Postgres doesn't support ADD VALUE to inline CHECK).

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'InterestRequest','Accepted','Rejected',
    'PaymentReceived','ConnectionUnlocked','System',
    'NewChatMessage'
  ));
