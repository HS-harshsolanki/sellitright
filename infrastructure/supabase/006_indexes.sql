-- Performance indexes for listings queries

create index if not exists listings_status_created_at_idx
  on public.listings (status, created_at desc);

create index if not exists listings_seller_id_idx
  on public.listings (seller_id);

create index if not exists listings_city_idx
  on public.listings (city);

create index if not exists listings_status_price_idx
  on public.listings (status, price);

create index if not exists listings_property_type_idx
  on public.listings (property_type);

create index if not exists listings_bhk_type_idx
  on public.listings (bhk_type);

-- Payments table indexes
create index if not exists payments_buyer_id_idx     on public.payments (buyer_id);
create index if not exists payments_interest_id_idx  on public.payments (interest_id);
create index if not exists payments_order_id_idx     on public.payments (razorpay_order_id);
