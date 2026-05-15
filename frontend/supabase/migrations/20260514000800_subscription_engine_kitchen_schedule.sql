alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('customer', 'admin', 'super_admin', 'kitchen_manager', 'delivery_staff', 'delivery', 'customer_support'));

alter table public.profiles
add column if not exists free_meal_credit int not null default 1;

alter table public.profiles
alter column wallet_balance set default 0;

alter table public.subscription_plans
add column if not exists meal_type text not null default 'lunch'
  check (meal_type in ('lunch', 'dinner', 'both')),
add column if not exists plan_interval text not null default 'weekly'
  check (plan_interval in ('daily', 'weekly', 'monthly', 'custom'));

alter table public.user_subscriptions
add column if not exists meal_type text not null default 'lunch'
  check (meal_type in ('lunch', 'dinner', 'both')),
add column if not exists consumed_meals int not null default 0,
add column if not exists paused_meals int not null default 0,
add column if not exists remaining_meals int not null default 0,
add column if not exists activated_at timestamptz,
add column if not exists expired_at timestamptz;

update public.user_subscriptions
set remaining_meals = meals_left
where remaining_meals = 0 and meals_left > 0;

create table if not exists public.kitchen_schedule (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  lunch_closed boolean not null default false,
  dinner_closed boolean not null default false,
  full_day_closed boolean generated always as (lunch_closed and dinner_closed) stored,
  reason text,
  recurring_rule text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (date)
);

create table if not exists public.subscription_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid not null references public.user_subscriptions(id) on delete cascade,
  meal_type text not null check (meal_type in ('lunch', 'dinner')),
  date date not null,
  status text not null default 'active'
    check (status in ('active', 'consumed', 'paused', 'skipped', 'kitchen_closed', 'expired')),
  consumed_order_id uuid references public.orders(id) on delete set null,
  status_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (subscription_id, meal_type, date)
);

create index if not exists idx_kitchen_schedule_date
on public.kitchen_schedule(date);

create index if not exists idx_subscription_tracking_user_date
on public.subscription_tracking(user_id, date);

create index if not exists idx_subscription_tracking_subscription_status
on public.subscription_tracking(subscription_id, status);

create index if not exists idx_subscription_tracking_available
on public.subscription_tracking(user_id, date, meal_type)
where status = 'active';

create or replace function public.has_admin_permission(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.has_ops_permission(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role in ('admin', 'super_admin', 'kitchen_manager', 'delivery_staff', 'delivery', 'customer_support')
  );
$$;

create or replace function public.has_kitchen_permission(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role in ('admin', 'super_admin', 'kitchen_manager')
  );
$$;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.has_admin_permission(user_id);
$$;

create or replace function public.is_delivery_or_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role in ('delivery', 'delivery_staff', 'admin', 'super_admin')
  );
$$;

create or replace function public.is_meal_closed(p_date date, p_meal_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case
      when p_meal_type = 'lunch' then lunch_closed
      when p_meal_type = 'dinner' then dinner_closed
      else lunch_closed and dinner_closed
    end,
    false
  )
  from public.kitchen_schedule
  where date = p_date
  limit 1;
$$;

create or replace function public.consume_free_meal_credit(
  p_menu_date date,
  p_meal_type text default 'lunch'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_order_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if coalesce(v_profile.free_meal_credit, 0) <= 0 then
    raise exception 'No free meal credit available';
  end if;

  if public.is_meal_closed(p_menu_date, p_meal_type) then
    raise exception 'Kitchen is closed for this meal';
  end if;

  v_order_id := gen_random_uuid();

  insert into public.orders (
    id, user_id, order_type, menu_date, amount, address, status,
    payment_mode, payment_status, created_at
  )
  values (
    v_order_id, v_user_id, 'free_meal', p_menu_date, 0, v_profile.address_summary,
    'preparing', 'free_credit', 'paid', now()
  );

  update public.profiles
  set free_meal_credit = free_meal_credit - 1
  where id = v_user_id;

  return v_order_id;
end;
$$;

create or replace function public.consume_subscription_meal(
  p_tracking_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.subscription_tracking;
  v_profile public.profiles;
  v_order_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.subscription_tracking
  where id = p_tracking_id
  for update;

  if not found then
    raise exception 'Meal entitlement not found';
  end if;

  if v_row.user_id <> v_user_id then
    raise exception 'Forbidden';
  end if;

  if v_row.status <> 'active' then
    raise exception 'Meal is not available';
  end if;

  if public.is_meal_closed(v_row.date, v_row.meal_type) then
    update public.subscription_tracking
    set status = 'kitchen_closed',
        status_reason = 'Kitchen closed',
        updated_at = now()
    where id = v_row.id;
    raise exception 'Kitchen is closed for this meal';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  v_order_id := gen_random_uuid();

  insert into public.orders (
    id, user_id, order_type, menu_date, amount, address, status,
    payment_mode, payment_status, created_at
  )
  values (
    v_order_id, v_user_id, 'subscription', v_row.date, 0, v_profile.address_summary,
    'preparing', 'subscription', 'paid', now()
  );

  update public.subscription_tracking
  set status = 'consumed',
      consumed_order_id = v_order_id,
      updated_at = now()
  where id = v_row.id;

  update public.user_subscriptions
  set consumed_meals = consumed_meals + 1,
      meals_left = greatest(meals_left - 1, 0),
      remaining_meals = greatest(remaining_meals - 1, 0)
  where id = v_row.subscription_id;

  return v_order_id;
end;
$$;

grant execute on function public.consume_free_meal_credit(date, text) to authenticated;
grant execute on function public.consume_subscription_meal(uuid) to authenticated;

alter table public.kitchen_schedule enable row level security;
alter table public.subscription_tracking enable row level security;

drop policy if exists "kitchen schedule authenticated read" on public.kitchen_schedule;
create policy "kitchen schedule authenticated read" on public.kitchen_schedule
for select using (auth.role() = 'authenticated');

drop policy if exists "kitchen schedule admin write" on public.kitchen_schedule;
create policy "kitchen schedule admin write" on public.kitchen_schedule
for all using (public.has_kitchen_permission(auth.uid()))
with check (public.has_kitchen_permission(auth.uid()));

drop policy if exists "subscription tracking own read" on public.subscription_tracking;
create policy "subscription tracking own read" on public.subscription_tracking
for select using (auth.uid() = user_id or public.has_ops_permission(auth.uid()));

drop policy if exists "subscription tracking admin write" on public.subscription_tracking;
create policy "subscription tracking admin write" on public.subscription_tracking
for all using (public.has_admin_permission(auth.uid()))
with check (public.has_admin_permission(auth.uid()));

drop policy if exists "subscription tracking own insert" on public.subscription_tracking;
create policy "subscription tracking own insert" on public.subscription_tracking
for insert with check (auth.uid() = user_id);

drop policy if exists "subscription tracking own pause update" on public.subscription_tracking;
create policy "subscription tracking own pause update" on public.subscription_tracking
for update using (auth.uid() = user_id and status in ('active', 'paused'))
with check (auth.uid() = user_id and status in ('active', 'paused'));
