-- Adds generic gateway columns alongside existing Razorpay-specific columns.
-- Existing Razorpay rows get gateway = 'razorpay' via DEFAULT automatically.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_gateway_order_unique
  ON payments (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_gateway_payment_unique
  ON payments (gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;
