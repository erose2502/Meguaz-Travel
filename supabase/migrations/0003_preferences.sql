-- Personalization: the handful of settings the planner should remember between
-- trips so a returning traveller does not re-enter the same brief every time.
--
-- `home_airport` and `travel_style` already exist in 0001_init.sql; these are
-- the fields the planner learns from an actual booking.

alter table public.profiles
  add column if not exists preferred_cabin text
    check (preferred_cabin in ('economy', 'premium_economy', 'business', 'first')),
  add column if not exists default_budget_usd numeric,
  add column if not exists airport_buffer_min int,
  add column if not exists trips_planned int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- A profile row should exist for every signed-up user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Owners read and write only their own profile.
alter table public.profiles enable row level security;

drop policy if exists "profiles are self-service" on public.profiles;
create policy "profiles are self-service" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
