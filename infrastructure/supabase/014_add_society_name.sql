-- Add society_name column to listings table.
-- The column is referenced in application code (validators, draft/create routes,
-- listing-mapper) but was never tracked in migrations.
alter table listings
  add column if not exists society_name text;
