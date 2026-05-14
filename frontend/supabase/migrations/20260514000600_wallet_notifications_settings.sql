create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('credit', 'debit')),
  amount numeric not null,
  source text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key default 'main',
  cod_enabled boolean not null default true,
  delivery_zones text[] not null default '{}'
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'info',
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
