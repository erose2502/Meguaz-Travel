-- Meguaz — Supabase security hardening. Run in the Supabase SQL editor.
--
-- Context: ALL application access goes through the Next backend using the
-- service role (which bypasses RLS), and the anon key is never shipped to
-- the browser. So the correct posture is: RLS ON everywhere, with NO anon/
-- authenticated policies — public keys can then read and write nothing,
-- and the backend keeps working unchanged.

-- 1) Enable RLS on every table in public (idempotent).
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- 2) SECURITY DEFINER functions: pin search_path so they cannot be hijacked
--    via schema shadowing. Lists the offenders first; then pin each one.
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef;

-- For each row returned above, run (replacing name/args):
-- alter function public.<name>(<args>) set search_path = public, pg_temp;

-- 3) Profile language preference (from the app's Your-language feature):
alter table public.profiles add column if not exists preferred_language text;

-- 4) Leaked-password protection is a dashboard toggle, not SQL:
--    Dashboard → Authentication → Providers → Email →
--    enable "Leaked password protection" (HaveIBeenPwned check).
