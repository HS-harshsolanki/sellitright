# Supabase Migrations

## Canonical Source

The **authoritative** migration set is in `infrastructure/supabase/`.

Run migrations in this exact order for a fresh database:

| Order | File                                                   | Description                                    |
| ----- | ------------------------------------------------------ | ---------------------------------------------- |
| 1     | infrastructure/supabase/001_listings.sql               | Core listings, profiles, buyer_interest tables |
| 2     | infrastructure/supabase/002_admin.sql                  | Admin roles and audit log                      |
| 3     | infrastructure/supabase/003_trust_safety.sql           | Reports and blocks                             |
| 4     | infrastructure/supabase/004_buyer_interest.sql         | Buyer interest ENUMs and policies              |
| 5     | infrastructure/supabase/005_payments.sql               | Payments table                                 |
| 6     | apps/web/supabase/migrations/003_notifications.sql     | Notifications table (CANONICAL)                |
| 7     | infrastructure/supabase/006_indexes.sql                | Performance indexes                            |
| 8     | infrastructure/supabase/007_rls_contact_protection.sql | Contact unlock RLS                             |
| 9     | infrastructure/supabase/009_payments_listing_fk.sql    | payments.listing_id FK + cascade fix           |

## Files in this directory

These are supplementary migrations run after the infrastructure/ base schema:

- `002_payments.sql` — payments table (superseded by infrastructure/005, kept for reference)
- `003_notifications.sql` — **CANONICAL** notifications table definition
- `003_trust_safety.sql` — trust & safety reports/blocks tables
- `004_notifications_realtime.sql` — enable Realtime on notifications table
- `005_admin_portal.sql` — admin portal tables

## Realtime

After running all migrations, enable Realtime for the notifications table:
Run `apps/web/supabase/migrations/004_notifications_realtime.sql` in the Supabase dashboard SQL editor.
