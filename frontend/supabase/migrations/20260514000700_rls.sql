alter table public.profiles enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.daily_menu enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.orders enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.settings enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "profiles own or admin select" on public.profiles;
create policy "profiles own or admin select" on public.profiles
for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
for update using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "wallet own access" on public.wallet_transactions;
create policy "wallet own access" on public.wallet_transactions
for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "plans authenticated read" on public.subscription_plans;
create policy "plans authenticated read" on public.subscription_plans
for select using (auth.role() = 'authenticated');

drop policy if exists "plans admin write" on public.subscription_plans;
create policy "plans admin write" on public.subscription_plans
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "menu authenticated read" on public.daily_menu;
create policy "menu authenticated read" on public.daily_menu
for select using (auth.role() = 'authenticated');

drop policy if exists "menu admin write" on public.daily_menu;
create policy "menu admin write" on public.daily_menu
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "subscriptions own access" on public.user_subscriptions;
create policy "subscriptions own access" on public.user_subscriptions
for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "orders own delivery admin access" on public.orders;
create policy "orders own delivery admin access" on public.orders
for all using (auth.uid() = user_id or public.is_delivery_or_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_delivery_or_admin(auth.uid()));

drop policy if exists "payments own access" on public.payment_transactions;
create policy "payments own access" on public.payment_transactions
for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "settings authenticated read" on public.settings;
create policy "settings authenticated read" on public.settings
for select using (auth.role() = 'authenticated');

drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "notifications own access" on public.notifications;
create policy "notifications own access" on public.notifications
for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "push own access" on public.push_subscriptions;
create policy "push own access" on public.push_subscriptions
for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));
