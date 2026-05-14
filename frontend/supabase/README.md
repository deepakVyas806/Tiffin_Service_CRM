# Supabase Setup

This project now supports the Supabase CLI migration workflow.

## Recommended setup

From the `frontend` directory:

```bash
npm install
npx supabase init
npx supabase start
npx supabase db reset
```

`npx supabase db reset` applies every file in `supabase/migrations/` and then runs `supabase/seed.sql`.

To connect this repo to a hosted Supabase project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Environment variables

Create `frontend/.env.local` with values from Supabase Dashboard -> Project Settings -> API:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

## Auth model

The app uses Supabase Auth for email/password registration, login, logout, session cookies, and current-user lookup.

App-specific user data lives in `public.profiles`, which references `auth.users(id)`. That table stores role, wallet balance, address, dietary tags, and onboarding state.

The frontend uses the publishable key, so access is controlled by Supabase Auth plus Row Level Security policies. The frontend cannot create tables or safely perform privileged server-only actions.

## Admin and delivery roles

After registering users through the app, promote them from Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', onboarded = true
where email = 'admin@example.com';

update public.profiles
set role = 'delivery', onboarded = true
where email = 'delivery@tiffinflow.com';
```

## Legacy schema files

The old manual SQL setup remains in `supabase/schema/` for reference, but the preferred workflow is now `supabase/migrations/` plus `supabase/seed.sql`.

Payments are currently local/demo payments in the browser, matching the previous local `sk_test_dummy` behavior. Production Stripe payments should be moved to Supabase Edge Functions or another trusted server because Stripe secret keys must never be exposed to the frontend.
