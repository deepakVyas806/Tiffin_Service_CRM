# Schema Modules

Run these files in Supabase SQL Editor in this order:

1. `00_extensions.sql`
2. `01_role_functions.sql`
3. `02_profiles.sql`
4. `03_catalog.sql`
5. `04_subscriptions_orders_payments.sql`
6. `05_wallet_notifications_settings.sql`
7. `06_rls.sql`
8. `07_seed.sql`

After a user registers in the app, promote admin and delivery accounts from SQL Editor:

```sql
update public.profiles
set role = 'admin', onboarded = true
where email = 'admin@example.com';

update public.profiles
set role = 'delivery', onboarded = true
where email = 'delivery@tiffinflow.com';
```
