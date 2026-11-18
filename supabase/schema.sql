create table if not exists public.services (
  id text primary key,
  name text not null,
  category text not null,
  price integer not null,
  duration text not null,
  description text,
  icon text,
  active boolean not null default true
);

create table if not exists public.bookings (
  id text primary key,
  service_id text references public.services(id),
  service_name text not null,
  price integer not null,
  customer_name text not null,
  phone text not null,
  address text not null,
  landmark text,
  booking_date date not null,
  booking_time text not null,
  payment_method text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;
alter table public.bookings enable row level security;

create policy "Anyone can read active services"
on public.services for select
to anon, authenticated
using (active = true);

create policy "Anyone can create bookings"
on public.bookings for insert
to anon, authenticated
with check (true);

create policy "Authenticated admins can view bookings"
on public.bookings for select
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Authenticated admins can update bookings"
on public.bookings for update
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into public.services (id, name, category, price, duration, description, icon) values
  ('bridal-hd', 'Bridal HD Makeup', 'Makeup', 4999, '3 hours', 'Complete HD bridal look', '💄'),
  ('party-makeup', 'Party Glam Makeup', 'Makeup', 1499, '90 min', 'Soft glam for every occasion', '✨'),
  ('gold-facial', 'Gold Glow Facial', 'Facial', 999, '60 min', 'Radiance-boosting gold facial', '🌟'),
  ('fruit-facial', 'Fruit Glow Facial', 'Facial', 799, '45 min', 'Fresh and natural glow', '🍊'),
  ('full-wax', 'Full Arms & Legs Wax', 'Waxing', 1299, '75 min', 'Smooth, hygienic full waxing', '🌸'),
  ('hair-styling', 'Hair Styling', 'Hair', 699, '45 min', 'Curls, straighten or party style', '💇')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  duration = excluded.duration,
  description = excluded.description,
  icon = excluded.icon;
