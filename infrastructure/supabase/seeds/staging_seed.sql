-- =============================================================================
-- staging_seed.sql
-- Staging seed data for ChapterNew real estate marketplace.
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING.
-- All seed rows use UUIDs prefixed with '00000000-seed-' for easy identification.
--
-- IMPORTANT: This script inserts directly into public.profiles and bypasses
-- auth.users (Supabase Auth). These seed users exist only in public.profiles
-- and in the tables that reference auth.users via foreign keys. To test real
-- OAuth login flows, create real accounts and update the seed IDs accordingly.
--
-- Usage:
--   Supabase SQL Editor → paste and run
--   OR: supabase db execute --project-ref <ref> < infrastructure/supabase/seeds/staging_seed.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — SEED PROFILES
-- Bypasses auth.users trigger. Inserts directly into public.profiles.
-- The FK on buyer_interest, listings, etc. references auth.users(id).
-- We must also insert stub rows into auth.users for FK integrity, OR use
-- service-role to disable FK checks — neither is possible in plain SQL.
--
-- WORKAROUND: Insert seed rows into auth.users using the Supabase service role
-- context. The SQL Editor in the Supabase Dashboard runs as postgres (superuser)
-- so INSERT INTO auth.users is allowed.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- ── Sellers ────────────────────────────────────────────────────────────────

  -- seller_1: Mumbai — Rahul Mehta
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data, is_super_admin
  ) VALUES (
    '00000000-seed-0001-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'rahul.mehta.seed@chapternew.dev',
    '$2a$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    now(), now(), now(),
    '{"full_name": "Rahul Mehta", "avatar_url": null}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- seller_2: Bangalore — Priya Sharma
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data, is_super_admin
  ) VALUES (
    '00000000-seed-0001-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'priya.sharma.seed@chapternew.dev',
    '$2a$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    now(), now(), now(),
    '{"full_name": "Priya Sharma", "avatar_url": null}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- seller_3: Delhi — Amit Gupta
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data, is_super_admin
  ) VALUES (
    '00000000-seed-0001-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'amit.gupta.seed@chapternew.dev',
    '$2a$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    now(), now(), now(),
    '{"full_name": "Amit Gupta", "avatar_url": null}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- ── Buyers ─────────────────────────────────────────────────────────────────

  -- buyer_1: Sneha Kapoor
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data, is_super_admin
  ) VALUES (
    '00000000-seed-0002-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'sneha.kapoor.seed@chapternew.dev',
    '$2a$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    now(), now(), now(),
    '{"full_name": "Sneha Kapoor", "avatar_url": null}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- buyer_2: Vikram Nair
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data, is_super_admin
  ) VALUES (
    '00000000-seed-0002-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'vikram.nair.seed@chapternew.dev',
    '$2a$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    now(), now(), now(),
    '{"full_name": "Vikram Nair", "avatar_url": null}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- buyer_3: Ananya Iyer
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data, is_super_admin
  ) VALUES (
    '00000000-seed-0002-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'ananya.iyer.seed@chapternew.dev',
    '$2a$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    now(), now(), now(),
    '{"full_name": "Ananya Iyer", "avatar_url": null}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- buyer_4: Rohan Desai
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data, is_super_admin
  ) VALUES (
    '00000000-seed-0002-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'rohan.desai.seed@chapternew.dev',
    '$2a$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    now(), now(), now(),
    '{"full_name": "Rohan Desai", "avatar_url": null}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- ── Admin ──────────────────────────────────────────────────────────────────

  -- admin_1: ChapterNew Admin
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data, is_super_admin
  ) VALUES (
    '00000000-seed-0099-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin.seed@chapternew.dev',
    '$2a$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    now(), now(), now(),
    '{"full_name": "ChapterNew Admin", "avatar_url": null}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  ) ON CONFLICT (id) DO NOTHING;

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — PROFILES
-- Mirror the auth.users rows into public.profiles.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
VALUES
  -- Sellers
  ('00000000-seed-0001-0000-000000000001', 'rahul.mehta.seed@chapternew.dev',  'Rahul Mehta',       null, now(), now()),
  ('00000000-seed-0001-0000-000000000002', 'priya.sharma.seed@chapternew.dev', 'Priya Sharma',      null, now(), now()),
  ('00000000-seed-0001-0000-000000000003', 'amit.gupta.seed@chapternew.dev',   'Amit Gupta',        null, now(), now()),
  -- Buyers
  ('00000000-seed-0002-0000-000000000001', 'sneha.kapoor.seed@chapternew.dev', 'Sneha Kapoor',      null, now(), now()),
  ('00000000-seed-0002-0000-000000000002', 'vikram.nair.seed@chapternew.dev',  'Vikram Nair',       null, now(), now()),
  ('00000000-seed-0002-0000-000000000003', 'ananya.iyer.seed@chapternew.dev',  'Ananya Iyer',       null, now(), now()),
  ('00000000-seed-0002-0000-000000000004', 'rohan.desai.seed@chapternew.dev',  'Rohan Desai',       null, now(), now()),
  -- Admin
  ('00000000-seed-0099-0000-000000000001', 'admin.seed@chapternew.dev',        'ChapterNew Admin',  null, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — LISTINGS
-- Prices in INR (integer). 45L = 4500000, 1Cr = 10000000, etc.
-- status: ACTIVE (visible publicly), PENDING_REVIEW (awaiting admin approval)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.listings (
  id, seller_id, title, description,
  price, property_type, bhk_type,
  built_up_area, carpet_area, floor, total_floors,
  facing, furnishing, age_of_property,
  bathrooms, balconies, parking,
  address, city, locality, state, pincode,
  latitude, longitude,
  amenities, image_urls,
  status, is_verified, view_count,
  created_at, updated_at
)
VALUES

  -- ── Mumbai: Seller 1 (Rahul Mehta) ─────────────────────────────────────────

  (
    '00000000-seed-0010-0000-000000000001',
    '00000000-seed-0001-0000-000000000001',
    '3 BHK Sea-View Apartment in Bandra West',
    'Luxurious 3 BHK flat on the 14th floor of a premium high-rise in Bandra West. Stunning partial sea views from the living room. Italian marble flooring, modular kitchen with Bosch appliances, and 3 large bedrooms with attached baths. The society has a rooftop pool, gymnasium, and 24x7 security. Walking distance to Linking Road and BKC. Ready to move in.',
    18500000,  -- ₹1.85 Cr
    'APARTMENT', '3BHK',
    1450, 1180, 14, 20,
    'West', 'SEMI_FURNISHED', 3,
    3, 2, 'COVERED',
    'Sea Breeze Towers, 14th Floor, Carter Road, Bandra West',
    'Mumbai', 'Bandra', 'Maharashtra', '400050',
    19.0596, 72.8295,
    ARRAY['Swimming Pool','Gymnasium','Power Backup','24x7 Security','Rooftop Garden','Visitor Parking'],
    ARRAY[
      'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800'
    ],
    'ACTIVE', true, 247,
    now() - interval '8 days', now() - interval '1 day'
  ),

  (
    '00000000-seed-0010-0000-000000000002',
    '00000000-seed-0001-0000-000000000001',
    '2 BHK Ready-to-Move Flat in Andheri East',
    'Well-maintained 2 BHK apartment in a gated complex near Seepz Metro Station. East-facing, excellent cross-ventilation. Recent modular kitchen, vitrified tile flooring, and a 24x7 CCTV monitored society. Ideal for working professionals — 5 minutes from MIDC and 10 minutes to BKC via metro. Two-wheeler parking included.',
    8200000,   -- ₹82 L
    'APARTMENT', '2BHK',
    1050, 870, 5, 12,
    'East', 'SEMI_FURNISHED', 6,
    2, 1, 'TWO_WHEELER',
    'Green Valley CHS, Building C, Andheri East',
    'Mumbai', 'Andheri', 'Maharashtra', '400093',
    19.1136, 72.8697,
    ARRAY['24x7 Security','CCTV','Children Play Area','Visitor Parking','Power Backup'],
    ARRAY[
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
    ],
    'ACTIVE', true, 89,
    now() - interval '15 days', now() - interval '3 days'
  ),

  (
    '00000000-seed-0010-0000-000000000003',
    '00000000-seed-0001-0000-000000000001',
    '3 BHK Premium Flat in Powai — Hiranandani Gardens',
    'Spacious 3 BHK in the prestigious Hiranandani Gardens township. Gated community with world-class amenities. Just 5 minutes from Powai Lake. The flat is fully furnished with high-end furniture, a modular kitchen, and wooden flooring in bedrooms. Society amenities include tennis court, indoor games room, and a large clubhouse. Ready for immediate possession.',
    14500000,  -- ₹1.45 Cr
    'APARTMENT', '3BHK',
    1600, 1320, 8, 14,
    'North', 'FULLY_FURNISHED', 10,
    3, 2, 'COVERED',
    'Hiranandani Gardens, Building Zen, Powai',
    'Mumbai', 'Powai', 'Maharashtra', '400076',
    19.1176, 72.9060,
    ARRAY['Club House','Tennis Court','Swimming Pool','Gymnasium','Indoor Games','Power Backup','Covered Parking'],
    ARRAY[
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800'
    ],
    'PENDING_REVIEW', false, 0,
    now() - interval '1 day', now() - interval '1 day'
  ),

  -- ── Bangalore: Seller 2 (Priya Sharma) ─────────────────────────────────────

  (
    '00000000-seed-0010-0000-000000000004',
    '00000000-seed-0001-0000-000000000002',
    '2 BHK Apartment for Sale in Koramangala 6th Block',
    'Modern 2 BHK on the 3rd floor in a boutique apartment complex in Koramangala 6th Block. Fully furnished with branded appliances and a premium kitchen. Located on a quiet lane, 5 minutes from Forum Mall and 10 minutes from Indiranagar. Perfect for IT professionals working in nearby tech parks. Society has 24x7 security and a rooftop terrace garden.',
    7800000,   -- ₹78 L
    'APARTMENT', '2BHK',
    1100, 920, 3, 6,
    'South', 'FULLY_FURNISHED', 4,
    2, 1, 'COVERED',
    'Elm Residences, 3rd Floor, 6th Block, Koramangala',
    'Bangalore', 'Koramangala', 'Karnataka', '560095',
    12.9352, 77.6245,
    ARRAY['24x7 Security','CCTV','Rooftop Garden','Power Backup','Covered Parking','Lift'],
    ARRAY[
      'https://images.unsplash.com/photo-1567225557594-88d73e55f2cb?w=800',
      'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800'
    ],
    'ACTIVE', true, 163,
    now() - interval '12 days', now() - interval '2 days'
  ),

  (
    '00000000-seed-0010-0000-000000000005',
    '00000000-seed-0001-0000-000000000002',
    '4 BHK Independent Villa in Indiranagar',
    'Rare 4 BHK independent villa on a 40x60 site in prime Indiranagar, just 200m from the 12th Main metro station. G+2 construction with a terrace and a private garden. Ground floor has a living room, dining, kitchen, and one bedroom. Upper floors have 3 bedrooms with attached baths. Italian marble flooring throughout, a premium modular kitchen with a breakfast counter, and a covered car porch for 2 cars.',
    22000000,  -- ₹2.2 Cr
    'VILLA', '4BHK',
    2400, 2200, 0, 3,
    'East', 'SEMI_FURNISHED', 7,
    4, 3, 'COVERED',
    '12th Main Road, Indiranagar',
    'Bangalore', 'Indiranagar', 'Karnataka', '560038',
    12.9784, 77.6408,
    ARRAY['Private Garden','Terrace','2 Car Parking','24x7 Security','Power Backup'],
    ARRAY[
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6d394d7c?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    'ACTIVE', true, 312,
    now() - interval '20 days', now() - interval '5 days'
  ),

  -- ── Delhi: Seller 3 (Amit Gupta) ────────────────────────────────────────────

  (
    '00000000-seed-0010-0000-000000000006',
    '00000000-seed-0001-0000-000000000003',
    '3 BHK Builder Floor in Vasant Kunj',
    'Spacious 3 BHK first-floor builder flat in Vasant Kunj Sector D. The flat faces the park and gets excellent natural light. Premium modular kitchen, master bedroom with walk-in wardrobe, and marble flooring throughout. Stilt parking for one car. Quiet, well-maintained lane. Close to Vasant Kunj Metro (Phase 4) and DLF Promenade Mall. Well-connected to Gurgaon via NH-48.',
    12500000,  -- ₹1.25 Cr
    'APARTMENT', '3BHK',
    1800, 1550, 1, 4,
    'North', 'SEMI_FURNISHED', 5,
    3, 2, 'STILT',
    'Sector D, Vasant Kunj',
    'Delhi', 'Vasant Kunj', 'Delhi', '110070',
    28.5213, 77.1567,
    ARRAY['Park Facing','Power Backup','Stilt Parking','24x7 Security','CCTV'],
    ARRAY[
      'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800',
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800'
    ],
    'ACTIVE', true, 198,
    now() - interval '10 days', now() - interval '2 days'
  ),

  (
    '00000000-seed-0010-0000-000000000007',
    '00000000-seed-0001-0000-000000000003',
    'Residential Plot for Sale in Dwarka Sector 23',
    '150 sq yard freehold residential plot in Dwarka Sector 23, Delhi. Regular rectangular shape, 25ft wide lane access, facing East. Fully approved with clear title. The plot is in a plotted development colony with all civic amenities — paved roads, streetlights, drainage, and nearby park. 10 minutes to Dwarka Sector 21 Metro terminal and IGI Airport approach.',
    6800000,   -- ₹68 L
    'PLOT', null,
    null, null, null, null,
    'East', null, null,
    null, null, null,
    'Sector 23, Dwarka',
    'Delhi', 'Dwarka', 'Delhi', '110075',
    28.5921, 77.0460,
    ARRAY['Clear Title','Paved Roads','Streetlights','Park Nearby','Metro Connectivity'],
    ARRAY[
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=800'
    ],
    'ACTIVE', true, 74,
    now() - interval '18 days', now() - interval '4 days'
  ),

  (
    '00000000-seed-0010-0000-000000000008',
    '00000000-seed-0001-0000-000000000003',
    '2 BHK DDA Flat in Dwarka Sector 10',
    'Well-maintained DDA flat on the 4th floor in Dwarka Sector 10. The flat is corner unit with good ventilation. Modular kitchen, 2 bathrooms, and one covered parking. Society has a park, community hall, and is just 3 minutes walk from Dwarka Sector 10 Metro. Ideal for government employees and families seeking a peaceful neighbourhood. Owner direct — no brokerage.',
    5800000,   -- ₹58 L
    'APARTMENT', '2BHK',
    950, 820, 4, 14,
    'South', 'UNFURNISHED', 12,
    2, 1, 'COVERED',
    'Pocket 2, Sector 10, Dwarka',
    'Delhi', 'Dwarka', 'Delhi', '110075',
    28.5838, 77.0590,
    ARRAY['24x7 Security','Park','Community Hall','Metro Nearby','Covered Parking'],
    ARRAY[
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800'
    ],
    'PENDING_REVIEW', false, 0,
    now() - interval '2 days', now() - interval '2 days'
  ),

  (
    '00000000-seed-0010-0000-000000000009',
    '00000000-seed-0001-0000-000000000002',
    '1 BHK Starter Apartment in Koramangala 5th Block',
    'Cozy 1 BHK on the 2nd floor in a low-rise complex in Koramangala 5th Block. Ideal for a single professional or couple. The kitchen is modular and the bedroom fits a queen bed comfortably. Society has 24x7 security and an intercom. Walking distance to HSR Layout and central Koramangala. Metro (5th Block) is 7 minutes away.',
    4500000,   -- ₹45 L
    'APARTMENT', '1BHK',
    620, 510, 2, 4,
    'West', 'SEMI_FURNISHED', 8,
    1, 1, 'TWO_WHEELER',
    '5th Block, Koramangala',
    'Bangalore', 'Koramangala', 'Karnataka', '560034',
    12.9304, 77.6181,
    ARRAY['24x7 Security','Intercom','Power Backup','Two-Wheeler Parking'],
    ARRAY[
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800'
    ],
    'ACTIVE', true, 41,
    now() - interval '5 days', now() - interval '1 day'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — BUYER INTEREST
-- Statuses: PENDING, ACCEPTED
-- contact_unlocked = true means seller accepted AND payment completed
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.buyer_interest (
  id, listing_id, buyer_id, seller_id,
  full_name, purpose, timeline, funding,
  message, status, contact_unlocked,
  seller_phone, seller_email, buyer_phone, buyer_email,
  created_at, updated_at
)
VALUES

  -- Interest 1: Sneha Kapoor → Bandra listing (listing 1, seller 1)
  -- ACCEPTED + unlocked (payment done)
  (
    '00000000-seed-0020-0000-000000000001',
    '00000000-seed-0010-0000-000000000001',
    '00000000-seed-0002-0000-000000000001',
    '00000000-seed-0001-0000-000000000001',
    'Sneha Kapoor', 'SELF', 'WITHIN_30_DAYS', 'LOAN_APPROVED',
    'Hi Rahul, I am very interested in this property. We have been looking for a sea-view flat in Bandra for a while. Could we schedule a visit this weekend?',
    'ACCEPTED', true,
    '+91-98765-43210', 'rahul.mehta@example.com',
    '+91-91234-56789', 'sneha.kapoor@example.com',
    now() - interval '6 days', now() - interval '4 days'
  ),

  -- Interest 2: Vikram Nair → Andheri listing (listing 2, seller 1)
  -- PENDING
  (
    '00000000-seed-0020-0000-000000000002',
    '00000000-seed-0010-0000-000000000002',
    '00000000-seed-0002-0000-000000000002',
    '00000000-seed-0001-0000-000000000001',
    'Vikram Nair', 'INVESTMENT', 'ONE_TO_THREE_MONTHS', 'CASH_READY',
    'Looking to invest in a ready-to-move flat near metro. This seems perfect. Is the price negotiable?',
    'PENDING', false,
    null, null, null, null,
    now() - interval '2 days', now() - interval '2 days'
  ),

  -- Interest 3: Ananya Iyer → Koramangala 2BHK (listing 4, seller 2)
  -- ACCEPTED + unlocked (payment done)
  (
    '00000000-seed-0020-0000-000000000003',
    '00000000-seed-0010-0000-000000000004',
    '00000000-seed-0002-0000-000000000003',
    '00000000-seed-0001-0000-000000000002',
    'Ananya Iyer', 'SELF', 'IMMEDIATELY', 'LOAN_IN_PROGRESS',
    'This flat looks exactly what I need. I am currently at RMZ Ecospace and Koramangala is perfect. Can we talk about the handover timeline?',
    'ACCEPTED', true,
    '+91-99887-76543', 'priya.sharma@example.com',
    '+91-92345-67890', 'ananya.iyer@example.com',
    now() - interval '9 days', now() - interval '6 days'
  ),

  -- Interest 4: Rohan Desai → Indiranagar Villa (listing 5, seller 2)
  -- PENDING
  (
    '00000000-seed-0020-0000-000000000004',
    '00000000-seed-0010-0000-000000000005',
    '00000000-seed-0002-0000-000000000004',
    '00000000-seed-0001-0000-000000000002',
    'Rohan Desai', 'SELF', 'ONE_TO_THREE_MONTHS', 'CASH_READY',
    'We are a family of 4 and have been looking for an independent villa in Indiranagar for the last 6 months. This is the first one that fits our budget and requirement.',
    'PENDING', false,
    null, null, null, null,
    now() - interval '3 days', now() - interval '3 days'
  ),

  -- Interest 5: Sneha Kapoor → Vasant Kunj 3BHK (listing 6, seller 3)
  -- ACCEPTED + unlocked (payment done)
  (
    '00000000-seed-0020-0000-000000000005',
    '00000000-seed-0010-0000-000000000006',
    '00000000-seed-0002-0000-000000000001',
    '00000000-seed-0001-0000-000000000003',
    'Sneha Kapoor', 'SELF', 'IMMEDIATELY', 'LOAN_APPROVED',
    'Park-facing flat in Vasant Kunj is exactly what we need. Shifting from Noida. Can we meet this Sunday for a visit?',
    'ACCEPTED', true,
    '+91-98765-11111', 'amit.gupta@example.com',
    '+91-91234-56789', 'sneha.kapoor@example.com',
    now() - interval '7 days', now() - interval '5 days'
  ),

  -- Interest 6: Vikram Nair → Dwarka Plot (listing 7, seller 3)
  -- PENDING
  (
    '00000000-seed-0020-0000-000000000006',
    '00000000-seed-0010-0000-000000000007',
    '00000000-seed-0002-0000-000000000002',
    '00000000-seed-0001-0000-000000000003',
    'Vikram Nair', 'INVESTMENT', 'EXPLORING', 'CASH_READY',
    'Interested in the Dwarka plot for investment. Please share the exact measurements and legal documents.',
    'PENDING', false,
    null, null, null, null,
    now() - interval '1 day', now() - interval '1 day'
  ),

  -- Interest 7: Ananya Iyer → Koramangala 1BHK (listing 9, seller 2)
  -- ACCEPTED, not yet unlocked (interest accepted but payment pending)
  (
    '00000000-seed-0020-0000-000000000007',
    '00000000-seed-0010-0000-000000000009',
    '00000000-seed-0002-0000-000000000003',
    '00000000-seed-0001-0000-000000000002',
    'Ananya Iyer', 'SELF', 'WITHIN_30_DAYS', 'CASH_READY',
    'Hi, I am also interested in this 1BHK as a backup option. Is it still available?',
    'ACCEPTED', false,
    null, null, null, null,
    now() - interval '4 days', now() - interval '3 days'
  ),

  -- Interest 8: Rohan Desai → Dwarka DDA Flat (listing 8, seller 3)
  -- PENDING
  (
    '00000000-seed-0020-0000-000000000008',
    '00000000-seed-0010-0000-000000000008',
    '00000000-seed-0002-0000-000000000004',
    '00000000-seed-0001-0000-000000000003',
    'Rohan Desai', 'SELF', 'ONE_TO_THREE_MONTHS', 'LOAN_IN_PROGRESS',
    'DDA flat in Dwarka Sector 10 looks good. Is the ownership clear and all dues paid to the society?',
    'PENDING', false,
    null, null, null, null,
    now() - interval '1 day', now() - interval '1 day'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — PAYMENTS
-- Only interests with contact_unlocked = true have a SUCCESS payment.
-- Amount: 4900 paise = ₹49 (platform fee)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.payments (
  id, buyer_id, seller_id, listing_id, interest_id,
  razorpay_order_id, razorpay_payment_id,
  status, amount, currency, paid_at, created_at
)
VALUES

  -- Payment 1: Sneha → Bandra listing
  (
    '00000000-seed-0030-0000-000000000001',
    '00000000-seed-0002-0000-000000000001',
    '00000000-seed-0001-0000-000000000001',
    '00000000-seed-0010-0000-000000000001',
    '00000000-seed-0020-0000-000000000001',
    'order_seed_staging_001',
    'pay_seed_staging_001',
    'SUCCESS', 4900, 'INR',
    now() - interval '4 days',
    now() - interval '4 days'
  ),

  -- Payment 2: Ananya → Koramangala 2BHK
  (
    '00000000-seed-0030-0000-000000000002',
    '00000000-seed-0002-0000-000000000003',
    '00000000-seed-0001-0000-000000000002',
    '00000000-seed-0010-0000-000000000004',
    '00000000-seed-0020-0000-000000000003',
    'order_seed_staging_002',
    'pay_seed_staging_002',
    'SUCCESS', 4900, 'INR',
    now() - interval '6 days',
    now() - interval '6 days'
  ),

  -- Payment 3: Sneha → Vasant Kunj 3BHK
  (
    '00000000-seed-0030-0000-000000000003',
    '00000000-seed-0002-0000-000000000001',
    '00000000-seed-0001-0000-000000000003',
    '00000000-seed-0010-0000-000000000006',
    '00000000-seed-0020-0000-000000000005',
    'order_seed_staging_003',
    'pay_seed_staging_003',
    'SUCCESS', 4900, 'INR',
    now() - interval '5 days',
    now() - interval '5 days'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6 — CHAT THREADS
-- Only for ACCEPTED interests where contact is unlocked.
-- listing_id in chat_threads is TEXT (not uuid FK).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.chat_threads (
  id, interest_id, listing_id,
  buyer_id, seller_id,
  status, buyer_unread, seller_unread,
  last_message_at, created_at
)
VALUES

  -- Thread 1: Sneha ↔ Rahul about Bandra flat
  (
    '00000000-seed-0040-0000-000000000001',
    '00000000-seed-0020-0000-000000000001',
    '00000000-seed-0010-0000-000000000001',
    '00000000-seed-0002-0000-000000000001',
    '00000000-seed-0001-0000-000000000001',
    'active', 0, 1,
    now() - interval '2 days',
    now() - interval '4 days'
  ),

  -- Thread 2: Ananya ↔ Priya about Koramangala 2BHK
  (
    '00000000-seed-0040-0000-000000000002',
    '00000000-seed-0020-0000-000000000003',
    '00000000-seed-0010-0000-000000000004',
    '00000000-seed-0002-0000-000000000003',
    '00000000-seed-0001-0000-000000000002',
    'active', 1, 0,
    now() - interval '1 day',
    now() - interval '6 days'
  ),

  -- Thread 3: Sneha ↔ Amit about Vasant Kunj flat
  (
    '00000000-seed-0040-0000-000000000003',
    '00000000-seed-0020-0000-000000000005',
    '00000000-seed-0010-0000-000000000006',
    '00000000-seed-0002-0000-000000000001',
    '00000000-seed-0001-0000-000000000003',
    'active', 0, 0,
    now() - interval '3 days',
    now() - interval '5 days'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7 — CHAT MESSAGES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.chat_messages (
  id, thread_id, sender_id, content, is_deleted, created_at
)
VALUES

  -- ── Thread 1: Sneha ↔ Rahul (Bandra flat) ──────────────────────────────────
  (
    '00000000-seed-0050-0000-000000000001',
    '00000000-seed-0040-0000-000000000001',
    '00000000-seed-0002-0000-000000000001',  -- Sneha
    'Hi Rahul! Thank you for accepting my interest. I am very excited about this property. Could we schedule a visit this Saturday around 11 AM?',
    false,
    now() - interval '4 days'
  ),
  (
    '00000000-seed-0050-0000-000000000002',
    '00000000-seed-0040-0000-000000000001',
    '00000000-seed-0001-0000-000000000001',  -- Rahul
    'Hi Sneha! Saturday 11 AM works perfectly. Please come to the lobby and call me. I will show you both the flat and the terrace.',
    false,
    now() - interval '3 days' - interval '6 hours'
  ),
  (
    '00000000-seed-0050-0000-000000000003',
    '00000000-seed-0040-0000-000000000001',
    '00000000-seed-0002-0000-000000000001',  -- Sneha
    'Perfect! See you Saturday. Also, is there any flexibility on the price given we are paying in cash with a pre-approved loan?',
    false,
    now() - interval '2 days'
  ),

  -- ── Thread 2: Ananya ↔ Priya (Koramangala 2BHK) ────────────────────────────
  (
    '00000000-seed-0050-0000-000000000004',
    '00000000-seed-0040-0000-000000000002',
    '00000000-seed-0002-0000-000000000003',  -- Ananya
    'Hello Priya! Very happy to connect. I am currently serving my notice period and plan to move by end of next month. Can we discuss the handover date?',
    false,
    now() - interval '6 days'
  ),
  (
    '00000000-seed-0050-0000-000000000005',
    '00000000-seed-0040-0000-000000000002',
    '00000000-seed-0001-0000-000000000002',  -- Priya
    'Hi Ananya! That works great for us. We can hand over by the 15th of next month. The flat will be fully furnished as listed. We will retain only personal items. When can you come for a second visit?',
    false,
    now() - interval '5 days' - interval '3 hours'
  ),
  (
    '00000000-seed-0050-0000-000000000006',
    '00000000-seed-0040-0000-000000000002',
    '00000000-seed-0002-0000-000000000003',  -- Ananya
    'This Sunday afternoon works for me — say 3 PM? I will also bring my father who will co-sign the agreement.',
    false,
    now() - interval '1 day'
  ),

  -- ── Thread 3: Sneha ↔ Amit (Vasant Kunj) ───────────────────────────────────
  (
    '00000000-seed-0050-0000-000000000007',
    '00000000-seed-0040-0000-000000000003',
    '00000000-seed-0002-0000-000000000001',  -- Sneha
    'Hi Amit! We visited the building yesterday from outside. The neighborhood looks very good. Can we visit the flat this week?',
    false,
    now() - interval '5 days'
  ),
  (
    '00000000-seed-0050-0000-000000000008',
    '00000000-seed-0040-0000-000000000003',
    '00000000-seed-0001-0000-000000000003',  -- Amit
    'Hi Sneha, I am available Thursday evening from 6 PM or any day over the weekend. Please confirm which works for you.',
    false,
    now() - interval '4 days' - interval '2 hours'
  ),
  (
    '00000000-seed-0050-0000-000000000009',
    '00000000-seed-0040-0000-000000000003',
    '00000000-seed-0002-0000-000000000001',  -- Sneha
    'Thursday 6 PM works. See you then! My husband will also join.',
    false,
    now() - interval '3 days'
  )

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8 — NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.notifications (
  id, user_id, title, message, type,
  entity_type, entity_id, read, created_at
)
VALUES

  -- Seller 1 (Rahul) — new interest received on Andheri listing from Vikram
  (
    '00000000-seed-0060-0000-000000000001',
    '00000000-seed-0001-0000-000000000001',
    'New Interest Request',
    'Vikram Nair is interested in your listing "2 BHK Ready-to-Move Flat in Andheri East". Review and respond within 48 hours.',
    'InterestRequest',
    'buyer_interest', '00000000-seed-0020-0000-000000000002',
    false, now() - interval '2 days'
  ),

  -- Seller 2 (Priya) — new interest received on Indiranagar villa from Rohan
  (
    '00000000-seed-0060-0000-000000000002',
    '00000000-seed-0001-0000-000000000002',
    'New Interest Request',
    'Rohan Desai is interested in your listing "4 BHK Independent Villa in Indiranagar". Review and respond within 48 hours.',
    'InterestRequest',
    'buyer_interest', '00000000-seed-0020-0000-000000000004',
    false, now() - interval '3 days'
  ),

  -- Seller 3 (Amit) — new interest on Dwarka plot from Vikram
  (
    '00000000-seed-0060-0000-000000000003',
    '00000000-seed-0001-0000-000000000003',
    'New Interest Request',
    'Vikram Nair is interested in your listing "Residential Plot for Sale in Dwarka Sector 23". Review and respond within 48 hours.',
    'InterestRequest',
    'buyer_interest', '00000000-seed-0020-0000-000000000006',
    false, now() - interval '1 day'
  ),

  -- Buyer Sneha — interest accepted by Rahul (Bandra)
  (
    '00000000-seed-0060-0000-000000000004',
    '00000000-seed-0002-0000-000000000001',
    'Your Interest Was Accepted!',
    'Great news! Rahul Mehta has accepted your interest in "3 BHK Sea-View Apartment in Bandra West". Unlock contact details to connect directly.',
    'Accepted',
    'buyer_interest', '00000000-seed-0020-0000-000000000001',
    true, now() - interval '4 days'
  ),

  -- Buyer Sneha — contact unlocked for Bandra flat
  (
    '00000000-seed-0060-0000-000000000005',
    '00000000-seed-0002-0000-000000000001',
    'Contact Unlocked',
    'You have successfully unlocked the seller contact for "3 BHK Sea-View Apartment in Bandra West". Check the listing to view seller details.',
    'ConnectionUnlocked',
    'buyer_interest', '00000000-seed-0020-0000-000000000001',
    true, now() - interval '4 days'
  ),

  -- Seller 1 (Rahul) — payment received from Sneha
  (
    '00000000-seed-0060-0000-000000000006',
    '00000000-seed-0001-0000-000000000001',
    'Buyer Unlocked Your Contact',
    'Sneha Kapoor has paid to unlock your contact details for "3 BHK Sea-View Apartment in Bandra West". Expect a call soon!',
    'PaymentReceived',
    'payments', '00000000-seed-0030-0000-000000000001',
    true, now() - interval '4 days'
  ),

  -- Buyer Ananya — interest accepted by Priya (Koramangala)
  (
    '00000000-seed-0060-0000-000000000007',
    '00000000-seed-0002-0000-000000000003',
    'Your Interest Was Accepted!',
    'Great news! Priya Sharma has accepted your interest in "2 BHK Apartment for Sale in Koramangala 6th Block". Unlock contact details to connect directly.',
    'Accepted',
    'buyer_interest', '00000000-seed-0020-0000-000000000003',
    true, now() - interval '6 days'
  ),

  -- Buyer Ananya — contact unlocked for Koramangala flat
  (
    '00000000-seed-0060-0000-000000000008',
    '00000000-seed-0002-0000-000000000003',
    'Contact Unlocked',
    'You have successfully unlocked the seller contact for "2 BHK Apartment for Sale in Koramangala 6th Block". Check the listing to view seller details.',
    'ConnectionUnlocked',
    'buyer_interest', '00000000-seed-0020-0000-000000000003',
    true, now() - interval '6 days'
  ),

  -- Seller 2 (Priya) — payment received from Ananya
  (
    '00000000-seed-0060-0000-000000000009',
    '00000000-seed-0001-0000-000000000002',
    'Buyer Unlocked Your Contact',
    'Ananya Iyer has paid to unlock your contact details for "2 BHK Apartment for Sale in Koramangala 6th Block". Expect a call soon!',
    'PaymentReceived',
    'payments', '00000000-seed-0030-0000-000000000002',
    true, now() - interval '6 days'
  ),

  -- Buyer Sneha — interest accepted by Amit (Vasant Kunj)
  (
    '00000000-seed-0060-0000-000000000010',
    '00000000-seed-0002-0000-000000000001',
    'Your Interest Was Accepted!',
    'Amit Gupta has accepted your interest in "3 BHK Builder Floor in Vasant Kunj". Unlock contact details to connect directly.',
    'Accepted',
    'buyer_interest', '00000000-seed-0020-0000-000000000005',
    true, now() - interval '5 days'
  ),

  -- Buyer Ananya — interest accepted by Priya (1BHK Koramangala)
  (
    '00000000-seed-0060-0000-000000000011',
    '00000000-seed-0002-0000-000000000003',
    'Your Interest Was Accepted!',
    'Priya Sharma has accepted your interest in "1 BHK Starter Apartment in Koramangala 5th Block". Unlock contact details to connect directly.',
    'Accepted',
    'buyer_interest', '00000000-seed-0020-0000-000000000007',
    false, now() - interval '3 days'
  ),

  -- Chat message notifications
  (
    '00000000-seed-0060-0000-000000000012',
    '00000000-seed-0001-0000-000000000001',
    'New Message from Sneha Kapoor',
    'Sneha Kapoor sent you a message about "3 BHK Sea-View Apartment in Bandra West".',
    'NewChatMessage',
    'chat_thread', '00000000-seed-0040-0000-000000000001',
    false, now() - interval '2 days'
  ),

  (
    '00000000-seed-0060-0000-000000000013',
    '00000000-seed-0002-0000-000000000003',
    'New Message from Priya Sharma',
    'Priya Sharma replied to your message about "2 BHK Apartment for Sale in Koramangala 6th Block".',
    'NewChatMessage',
    'chat_thread', '00000000-seed-0040-0000-000000000002',
    false, now() - interval '1 day'
  )

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DONE.
-- Seed summary:
--   auth.users:      8  (3 sellers + 4 buyers + 1 admin)
--   profiles:        8
--   listings:        9  (7 ACTIVE + 2 PENDING_REVIEW)
--   buyer_interest:  8  (3 ACCEPTED+unlocked, 1 ACCEPTED, 4 PENDING)
--   payments:        3  (all SUCCESS)
--   chat_threads:    3
--   chat_messages:   9
--   notifications:  13
-- =============================================================================
