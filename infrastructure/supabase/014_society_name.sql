-- Add society_name to listings for map clustering and display
alter table listings
  add column if not exists society_name text check (char_length(society_name) <= 200);

comment on column listings.society_name is
  'Residential society or building name — used for map pin labels and cluster grouping';

-- Index for searching by society name
create index if not exists listings_society_name_idx
  on listings using gin (to_tsvector('english', coalesce(society_name, '')));
