-- Trips and their slots are private to the traveller who created them.
--
-- 0001 created these tables without row-level security, which means the anon
-- key could read every user's itinerary. Enabling RLS closes that; the
-- policies below scope all access to the owning user.

alter table public.trips enable row level security;

drop policy if exists "trips are private to their owner" on public.trips;
create policy "trips are private to their owner" on public.trips
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.trip_slots enable row level security;

-- A slot inherits its owner from the trip it belongs to.
drop policy if exists "trip slots follow their trip" on public.trip_slots;
create policy "trip slots follow their trip" on public.trip_slots
  for all
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_slots.trip_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_slots.trip_id and t.user_id = auth.uid()
    )
  );

create index if not exists trips_user_created_idx
  on public.trips (user_id, created_at desc);
