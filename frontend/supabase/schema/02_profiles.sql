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

create or replace function public.prevent_customer_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' and new.role <> 'customer' then
    raise exception 'Only admins can assign elevated roles';
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'Only admins can change roles';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_customer_privilege_escalation on public.profiles;
create trigger prevent_customer_privilege_escalation
before insert or update on public.profiles
for each row execute function public.prevent_customer_privilege_escalation();
