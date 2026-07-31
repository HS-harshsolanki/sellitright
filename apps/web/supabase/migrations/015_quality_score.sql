-- Migration 015: AI Property Quality Score
-- Adds quality scoring columns to listings, creates history and benchmark tables.
-- Applied to production: NO

-- Quality score columns on listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS quality_score        SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_breakdown    JSONB,
  ADD COLUMN IF NOT EXISTS quality_scored_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_v2_scored    BOOLEAN NOT NULL DEFAULT FALSE;

-- Append-only history: one row per rescore event
CREATE TABLE IF NOT EXISTS listing_quality_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  score       SMALLINT NOT NULL,
  breakdown   JSONB NOT NULL,
  reason      TEXT, -- 'initial' | 'photo_added' | 'description_updated' | 'v2_scored' | 'verified' | 'reactivated' | 'benchmark_updated'
  scored_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_history_listing
  ON listing_quality_history(listing_id, scored_at DESC);

-- Locality price benchmarks (populated by weekly cron / seed script)
CREATE TABLE IF NOT EXISTS locality_price_benchmarks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city                  TEXT NOT NULL,
  locality              TEXT NOT NULL,
  property_type         TEXT NOT NULL,
  median_price_sqft     NUMERIC(10,2) NOT NULL,
  stddev_price_sqft     NUMERIC(10,2) NOT NULL,
  sample_count          INTEGER NOT NULL,
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city, locality, property_type)
);

-- Indexes for quality-weighted search ranking
CREATE INDEX IF NOT EXISTS idx_listings_quality_score
  ON listings(quality_score) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_listings_rank
  ON listings(city, quality_score DESC, created_at DESC) WHERE status = 'ACTIVE';

-- RLS for history table (sellers can read their own listing history)
ALTER TABLE listing_quality_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sellers_read_own_quality_history"
  ON listing_quality_history FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE seller_id = auth.uid()
    )
  );

-- RLS for benchmarks (public read for authenticated users)
ALTER TABLE locality_price_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benchmarks_public_read"
  ON locality_price_benchmarks FOR SELECT
  TO authenticated USING (true);

-- Weekly benchmark refresh via pg_cron (uncomment if pg_cron is enabled on the Supabase project)
-- SELECT cron.schedule(
--   'refresh-price-benchmarks',
--   '0 2 * * 0',
--   $$
--   INSERT INTO locality_price_benchmarks (city, locality, property_type, median_price_sqft, stddev_price_sqft, sample_count, computed_at)
--   SELECT
--     city,
--     locality,
--     property_type,
--     PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price::float / NULLIF(built_up_area, 0)) AS median_price_sqft,
--     STDDEV(price::float / NULLIF(built_up_area, 0)) AS stddev_price_sqft,
--     COUNT(*) AS sample_count,
--     NOW()
--   FROM listings
--   WHERE status = 'ACTIVE'
--     AND built_up_area > 0
--     AND price > 0
--   GROUP BY city, locality, property_type
--   HAVING COUNT(*) >= 10
--   ON CONFLICT (city, locality, property_type) DO UPDATE
--     SET median_price_sqft = EXCLUDED.median_price_sqft,
--         stddev_price_sqft = EXCLUDED.stddev_price_sqft,
--         sample_count = EXCLUDED.sample_count,
--         computed_at = EXCLUDED.computed_at;
--   $$
-- );
