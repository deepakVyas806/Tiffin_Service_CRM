create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  meal_count int not null,
  price numeric not null,
  validity_days int not null,
  badge text
);

create table if not exists public.daily_menu (
  date date primary key,
  main_dish text not null,
  sides text[] not null default '{}',
  nutrition jsonb not null default '{}',
  is_special boolean not null default false,
  image_url text,
  tags text[] not null default '{}'
);
