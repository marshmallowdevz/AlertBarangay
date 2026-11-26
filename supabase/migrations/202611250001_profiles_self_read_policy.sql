-- Ensure authenticated users can read the role row used by the login fallback.
-- The policy exposes only the caller's own profile; it grants no write access.
alter table public.profiles enable row level security;
grant select on table public.profiles to authenticated;

drop policy if exists "Authenticated users can read own profile" on public.profiles;
create policy "Authenticated users can read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);
