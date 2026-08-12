-- Meguaz security & durability layer.
-- Adds persistent rate limiting, LLM spend counters, and a shared provider cache
-- so protection survives restarts and works across serverless instances.
-- All three tables are service-role only: no RLS policies are defined, and RLS is
-- enabled, so anon/authenticated clients cannot read or write them at all.

-- ── Rate limiting ────────────────────────────────────────────────────────────
create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;

-- Atomic check-and-increment. Returns whether the call is allowed plus the
-- counters, in one round trip, safe under concurrency.
create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_hits integer;
  v_start timestamptz;
begin
  insert into public.rate_limits as rl (key, hits, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set hits = case
          when rl.window_start < v_now - make_interval(secs => p_window_seconds) then 1
          else rl.hits + 1
        end,
        window_start = case
          when rl.window_start < v_now - make_interval(secs => p_window_seconds) then v_now
          else rl.window_start
        end
  returning rl.hits, rl.window_start into v_hits, v_start;

  return jsonb_build_object(
    'allowed', v_hits <= p_max,
    'hits', v_hits,
    'limit', p_max,
    'reset_at', v_start + make_interval(secs => p_window_seconds)
  );
end;
$$;

-- ── LLM spend counters ───────────────────────────────────────────────────────
-- Keyed server-side (user id or hashed IP), never by a client-supplied session id.
create table if not exists public.usage_counters (
  key text primary key,
  tokens bigint not null default 0,
  window_start timestamptz not null default now()
);

alter table public.usage_counters enable row level security;

create or replace function public.add_token_usage(
  p_key text,
  p_tokens integer,
  p_window_seconds integer
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_total bigint;
begin
  insert into public.usage_counters as uc (key, tokens, window_start)
  values (p_key, greatest(p_tokens, 0), v_now)
  on conflict (key) do update
    set tokens = case
          when uc.window_start < v_now - make_interval(secs => p_window_seconds)
          then greatest(p_tokens, 0)
          else uc.tokens + greatest(p_tokens, 0)
        end,
        window_start = case
          when uc.window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now
          else uc.window_start
        end
  returning uc.tokens into v_total;

  return v_total;
end;
$$;

create or replace function public.get_token_usage(
  p_key text,
  p_window_seconds integer
) returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select tokens from public.usage_counters
      where key = p_key
        and window_start >= now() - make_interval(secs => p_window_seconds)),
    0
  );
$$;

-- ── Provider response cache ──────────────────────────────────────────────────
-- route_cache already exists (0001). Give it an expiry index and a writer that
-- only the service role can reach; readers stay public since it holds no PII.
create index if not exists route_cache_expires_at_idx
  on public.route_cache (expires_at);

create or replace function public.cache_put(
  p_key text,
  p_payload jsonb,
  p_ttl_seconds integer
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.route_cache (key, payload, expires_at)
  values (p_key, p_payload, now() + make_interval(secs => p_ttl_seconds))
  on conflict (key) do update
    set payload = excluded.payload,
        expires_at = excluded.expires_at;
$$;

create or replace function public.cache_get(p_key text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select payload from public.route_cache
   where key = p_key and expires_at > now();
$$;

-- Housekeeping: drop expired rows and stale counters.
create or replace function public.purge_expired()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.route_cache where expires_at < now();
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.usage_counters where window_start < now() - interval '7 days';
$$;

-- ── Lock down execution ──────────────────────────────────────────────────────
-- security definer functions must not be callable by browser-facing roles.
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.add_token_usage(text, integer, integer) from public, anon, authenticated;
revoke all on function public.get_token_usage(text, integer) from public, anon, authenticated;
revoke all on function public.cache_put(text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.cache_get(text) from public, anon, authenticated;
revoke all on function public.purge_expired() from public, anon, authenticated;

grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.add_token_usage(text, integer, integer) to service_role;
grant execute on function public.get_token_usage(text, integer) to service_role;
grant execute on function public.cache_put(text, jsonb, integer) to service_role;
grant execute on function public.cache_get(text) to service_role;
grant execute on function public.purge_expired() to service_role;

-- ── Tighten 0001 ─────────────────────────────────────────────────────────────
-- route_cache/destination_content were readable by anyone; keep reads public
-- (no PII, shared content) but make writes service-role only by ensuring no
-- insert/update policy exists. Explicitly revoke write grants as defence in depth.
revoke insert, update, delete on public.route_cache from anon, authenticated;
revoke insert, update, delete on public.destination_content from anon, authenticated;
