-- Run this in your Supabase SQL editor to set up the database

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  cuisine text,
  price_range smallint check (price_range between 1 and 4),
  created_at timestamptz default now()
);

create table visits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  date date not null,
  occasion text,
  notes text,
  created_at timestamptz default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  reviewer text check (reviewer in ('sam', 'olivia')),
  overall_rating real check (overall_rating between 0.5 and 5),
  food_rating real check (food_rating between 0.5 and 5),
  service_rating real check (service_rating between 0.5 and 5),
  ambiance_rating real check (ambiance_rating between 0.5 and 5),
  value_rating real check (value_rating between 0.5 and 5),
  review_text text,
  would_return text check (would_return in ('loved', 'liked', 'indifferent', 'didnt_like', 'hated')),
  is_pick boolean default false,
  created_at timestamptz default now(),
  unique(visit_id, reviewer)
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  url text not null,
  caption text,
  is_best_dish boolean default false,
  uploaded_by text check (uploaded_by in ('sam', 'olivia')),
  created_at timestamptz default now()
);

create table wishlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  cuisine text,
  price_range smallint check (price_range between 1 and 4),
  notes text,
  added_by text check (added_by in ('sam', 'olivia')),
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

-- Allow public read/write (no login required for this personal app)
alter table restaurants enable row level security;
alter table visits enable row level security;
alter table reviews enable row level security;
alter table photos enable row level security;
alter table wishlist enable row level security;

create policy "Public access" on restaurants for all using (true) with check (true);
create policy "Public access" on visits for all using (true) with check (true);
create policy "Public access" on reviews for all using (true) with check (true);
create policy "Public access" on photos for all using (true) with check (true);
create policy "Public access" on wishlist for all using (true) with check (true);
