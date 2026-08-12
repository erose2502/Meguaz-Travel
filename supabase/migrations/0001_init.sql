-- Meguaz initial schema. Run in Supabase SQL editor or `supabase db push`.

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_airport text,                       -- IATA, personalizes flight defaults
  stay_preference text check (stay_preference in ('home','resort')) default 'home',
  travel_style text,                        -- saver | balanced | comfort
  created_at timestamptz not null default now()
);

-- Trips: the spine of the product. Total-cost-first planning.
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date,
  end_date date,
  party_adults int not null default 1,
  budget_usd numeric,
  cost_lane text check (cost_lane in ('saver','balanced','comfort')) default 'balanced',
  estimated_total_usd numeric,
  status text not null default 'draft',    -- draft | planning | booked | traveling | done
  brief jsonb,                             -- parsed trip brief from NL search
  created_at timestamptz not null default now()
);

-- Trip slots: each bookable piece of a plan (flight / stay / ground leg)
create table if not exists public.trip_slots (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null check (kind in ('flight','stay','ground','activity')),
  day_index int,
  title text not null,
  status text not null default 'pending',
  -- pending | searching | selected | booking | booked | handed_off | booked_external
  provider text,                           -- duffel | duffel_stays | airbnb | operator
  provider_ref text,                       -- Duffel order id / Airbnb listing id / url
  estimated_usd numeric,
  actual_usd numeric,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Shared caches (cross-user, no PII)
create table if not exists public.route_cache (
  key text primary key,                    -- ground:origin:dest:YYYY-MM
  payload jsonb not null,
  expires_at timestamptz not null
);

create table if not exists public.destination_content (
  slug text primary key,                   -- e.g. 'lalibela-ethiopia'
  title text not null,
  blurb text,
  prep_checklist jsonb,
  video_url text,                          -- Higgsfield ambient loop
  poster_url text,
  created_at timestamptz not null default now()
);

-- Chat sessions (token budgeting + continuity)
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  tokens_used int not null default 0,
  summary text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_slots enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.route_cache enable row level security;
alter table public.destination_content enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own trips" on public.trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own trip slots" on public.trip_slots
  for all using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "own chat sessions" on public.chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared read-only content: anyone can read, only service role writes.
create policy "read route cache" on public.route_cache for select using (true);
create policy "read destination content" on public.destination_content for select using (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
