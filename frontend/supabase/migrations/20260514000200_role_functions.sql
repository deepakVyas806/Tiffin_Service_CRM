create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin', 'delivery')),
  address_summary text,
  geo_lat double precision,
  geo_lng double precision,
  dietary_tags text[] not null default '{}',
  wallet_balance numeric not null default 100,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

create or replace function public.is_delivery_or_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role in ('delivery', 'admin')
  );
$$;
