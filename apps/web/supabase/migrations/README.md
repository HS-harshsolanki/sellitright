# Supabase Migrations

## RECOMMENDED: One-file setup (idempotent, re-runnable)

**Use this for all fresh databases AND for re-applying on partially-migrated databases.**

Paste the entire file into **Supabase SQL Editor → Run**:

```
infrastructure/supabase/000_complete_idempotent_schema.sql
```

This single file is safe to run multiple times. It covers everything from all 11 individual migrations.
All `CREATE POLICY`, `CREATE TYPE`, and `CREATE TRIGGER` statements use `DROP IF EXISTS` or
exception-catching `DO` blocks — you will never hit a "policy already exists" error.

---

## Individual migrations (legacy — only if you need granular control)

If you prefer to run step-by-step, use this exact order. Each file must succeed before running the next.

| Order | File                                                        | Description                                                 |
| ----- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| 1     | infrastructure/supabase/001_listings.sql                    | Core listings table, RLS, updated_at trigger                |
| 2     | infrastructure/supabase/002_admin.sql                       | Admin roles and audit log                                   |
| 3     | apps/web/supabase/migrations/003_trust_safety.sql           | Reports, blocks, risk_scores, user_flags                    |
| 4     | infrastructure/supabase/003_rls_fixes.sql                   | Tighter RLS: sellers can only insert DRAFT/PENDING_REVIEW   |
| 5     | infrastructure/supabase/004_buyer_interest.sql              | Buyer interest ENUMs and policies                           |
| 6     | infrastructure/supabase/005_payments.sql                    | Payments table                                              |
| 7     | apps/web/supabase/migrations/003_notifications.sql          | Notifications table (CANONICAL)                             |
| 8     | infrastructure/supabase/006_indexes.sql                     | Performance indexes                                         |
| 9     | infrastructure/supabase/007_rls_contact_protection.sql      | Contact unlock RLS                                          |
| 10    | infrastructure/supabase/009_payments_listing_fk.sql         | payments.listing_id FK + cascade fix                        |
| 11    | infrastructure/supabase/010_schema_fixes.sql                | S1/S2/S4: reports FK, payments cascade, activity_logs deny  |
| 12    | infrastructure/supabase/011_search_and_perf_indexes.sql     | Full-text search vector, ACTIVE partial index, perf indexes |
| 13    | apps/web/supabase/migrations/005_admin_portal.sql           | Extend audit_log for non-listing entities                   |
| 14    | apps/web/supabase/migrations/004_notifications_realtime.sql | Enable Realtime on notifications                            |

**NOTE:** The individual files are NOT fully idempotent. If any migration fails mid-way,
use `000_complete_idempotent_schema.sql` instead — it handles any DB state safely.

## Files in this directory

- `002_payments.sql` — superseded by `infrastructure/005_payments.sql` (kept for reference, do not run)
- `003_notifications.sql` — **CANONICAL** notifications table definition
- `003_trust_safety.sql` — trust & safety reports/blocks tables
- `004_notifications_realtime.sql` — enable Realtime on notifications table (included in 000 file)
- `005_admin_portal.sql` — extends audit_log for admin portal (included in 000 file)
