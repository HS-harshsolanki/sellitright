-- applied to production: YES
-- Seller-controlled flag shown as "Price Negotiable" badge on listing cards
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS negotiable boolean NOT NULL DEFAULT false;
