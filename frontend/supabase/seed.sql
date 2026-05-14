insert into public.settings (id, cod_enabled, delivery_zones)
values ('main', true, array['560034', '560037', '560038', '560095'])
on conflict (id) do nothing;

insert into public.subscription_plans (id, name, description, meal_count, price, validity_days, badge)
values
  ('11111111-1111-4111-8111-111111111111', 'Trial Day', 'Try one tiffin before subscribing.', 1, 99, 1, 'Try once'),
  ('22222222-2222-4222-8222-222222222222', 'Weekly Plan', '7 home-style tiffins delivered Mon-Sun.', 7, 899, 7, 'Most flexible'),
  ('33333333-3333-4333-8333-333333333333', 'Monthly Plan', '30 chef-curated tiffins. Pause anytime.', 30, 3499, 31, 'Most popular'),
  ('44444444-4444-4444-8444-444444444444', 'High Protein', '30 high-protein tiffins for fitness goals.', 30, 3999, 31, 'Fitness pick')
on conflict (id) do nothing;

insert into public.daily_menu (date, main_dish, sides, nutrition, is_special, image_url, tags)
select
  (date_trunc('week', current_date)::date + offset)::date,
  main_dish,
  sides,
  nutrition::jsonb,
  is_special,
  image_url,
  tags
from (
  values
    (0, 'Paneer Butter Masala', array['Jeera Rice', 'Tawa Roti', 'Salad', 'Gulab Jamun'], '{"calories":720,"protein":28,"carbs":80,"fat":24}', false, 'https://images.unsplash.com/photo-1542444256-9dd3e45c9b81?crop=entropy&cs=srgb&fm=jpg&q=85&w=900', array['veg','north_indian']),
    (1, 'Rajma Chawal Bowl', array['Basmati Rice', 'Cucumber Raita', 'Pickle'], '{"calories":650,"protein":22,"carbs":90,"fat":16}', false, 'https://images.unsplash.com/photo-1734330932655-e6f3e7aff297?crop=entropy&cs=srgb&fm=jpg&q=85&w=900', array['veg','comfort']),
    (2, 'Chole Bhature Combo', array['Bhature x2', 'Onion Salad', 'Sweet Lassi'], '{"calories":850,"protein":24,"carbs":110,"fat":32}', true, 'https://images.unsplash.com/photo-1542444256-9dd3e45c9b81?crop=entropy&cs=srgb&fm=jpg&q=85&w=900', array['veg','special','punjabi']),
    (3, 'Mixed Veg Thali', array['Roti', 'Dal Tadka', 'Sabzi', 'Rice', 'Buttermilk'], '{"calories":690,"protein":24,"carbs":88,"fat":20}', false, 'https://images.unsplash.com/photo-1774106425926-bdbab1356790?crop=entropy&cs=srgb&fm=jpg&q=85&w=900', array['veg','thali']),
    (4, 'Bhindi Masala + Aloo Paratha', array['Curd', 'Salad', 'Mint Chutney'], '{"calories":680,"protein":18,"carbs":92,"fat":22}', false, 'https://images.unsplash.com/photo-1542444256-9dd3e45c9b81?crop=entropy&cs=srgb&fm=jpg&q=85&w=900', array['veg']),
    (5, 'Dal Makhani + Naan', array['Garlic Naan', 'Jeera Rice', 'Salad', 'Rasmalai'], '{"calories":820,"protein":26,"carbs":96,"fat":30}', true, 'https://images.unsplash.com/photo-1734330932655-e6f3e7aff297?crop=entropy&cs=srgb&fm=jpg&q=85&w=900', array['veg','special']),
    (6, 'Sunday Veg Biryani', array['Mirchi ka Salan', 'Raita', 'Salad'], '{"calories":780,"protein":22,"carbs":102,"fat":26}', true, 'https://images.unsplash.com/photo-1774106425926-bdbab1356790?crop=entropy&cs=srgb&fm=jpg&q=85&w=900', array['veg','special','biryani'])
) as seed(offset, main_dish, sides, nutrition, is_special, image_url, tags)
on conflict (date) do nothing;
