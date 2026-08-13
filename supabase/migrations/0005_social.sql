-- Social layer: avatars, destination reviews with star ratings, and follows.
--
-- Reviews are public content (the Google/Yelp read experience needs no login);
-- writing is scoped to the signed-in author. Follows are private to the two
-- sides. Avatars live in a public Supabase Storage bucket, one folder per user.

-- ── Avatars ──────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users manage files only inside their own folder: avatars/{uid}/...
drop policy if exists "avatar owners write their folder" on storage.objects;
create policy "avatar owners write their folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owners update their folder" on storage.objects;
create policy "avatar owners update their folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owners delete their folder" on storage.objects;
create policy "avatar owners delete their folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars are public to read" on storage.objects;
create policy "avatars are public to read" on storage.objects
  for select
  using (bucket_id = 'avatars');

-- ── Destination reviews ──────────────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  destination_code text not null check (destination_code ~ '^[A-Z]{3}$'),
  rating int not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One review per traveller per destination; writing again updates it.
  unique (user_id, destination_code)
);

create index if not exists reviews_destination_idx
  on public.reviews (destination_code, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "reviews are public to read" on public.reviews;
create policy "reviews are public to read" on public.reviews
  for select using (true);

drop policy if exists "authors write their own reviews" on public.reviews;
create policy "authors write their own reviews" on public.reviews
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "authors update their own reviews" on public.reviews;
create policy "authors update their own reviews" on public.reviews
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "authors delete their own reviews" on public.reviews;
create policy "authors delete their own reviews" on public.reviews
  for delete to authenticated
  using (auth.uid() = user_id);

-- ── Follows (community graph) ────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

drop policy if exists "follows visible to either side" on public.follows;
create policy "follows visible to either side" on public.follows
  for select to authenticated
  using (auth.uid() = follower_id or auth.uid() = followee_id);

drop policy if exists "followers manage their own follows" on public.follows;
create policy "followers manage their own follows" on public.follows
  for insert to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "followers remove their own follows" on public.follows;
create policy "followers remove their own follows" on public.follows
  for delete to authenticated
  using (auth.uid() = follower_id);
