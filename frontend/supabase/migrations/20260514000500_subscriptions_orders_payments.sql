create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  plan_name text not null,
  meals_left int not null,
  total_meals int not null,
  starts_at date not null,
  expires_at date not null,
  paused_dates text[] not null default '{}',
  delivered_dates text[] not null default '{}',
  status text not null default 'active',
  payment_status text not null default 'paid',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_type text not null default 'one_time',
  menu_date date,
  amount numeric not null,
  address text,
  notes text,
  status text not null default 'preparing',
  payment_mode text,
  payment_status text,
  cod_otp text,
  stripe_session_id text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  currency text not null default 'inr',
  kind text not null,
  plan_id uuid,
  order_id uuid,
  payment_status text not null default 'initiated',
  status text not null default 'pending',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
