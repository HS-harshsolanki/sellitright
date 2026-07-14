-- Add PhoneViolationWarning to the notifications type check constraint.
-- The type was used in chat/messages/route.ts but never added to the constraint.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'InterestRequest','Accepted','Rejected',
    'PaymentReceived','ConnectionUnlocked','System',
    'NewChatMessage','PhoneViolationWarning'
  ));

-- Also add the RPC function for atomic unread counter increment used by the chat message route.
CREATE OR REPLACE FUNCTION increment_unread_and_timestamp(
  p_thread_id UUID,
  p_unread_field TEXT,
  p_timestamp TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  IF p_unread_field = 'buyer_unread' THEN
    UPDATE chat_threads
    SET buyer_unread = buyer_unread + 1, last_message_at = p_timestamp
    WHERE id = p_thread_id;
  ELSIF p_unread_field = 'seller_unread' THEN
    UPDATE chat_threads
    SET seller_unread = seller_unread + 1, last_message_at = p_timestamp
    WHERE id = p_thread_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
