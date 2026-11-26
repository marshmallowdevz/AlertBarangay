-- Resident-only public sign-up and role-based row access.
-- Safe to re-run. Apply after 202611260001_incident_dispatch_history.sql.
--
-- What this enforces at the database level (the UI and proxy also check, but
-- the database is the last line of defence):
--   1. Every account created through Supabase Auth starts as an active
--      'resident'. Nothing a browser sends at sign-up (user metadata such as
--      {"role": "admin"}) can change that.
--   2. Only the trusted server (service role, used by the Admin dashboard's
--      user-management API) can turn an account into an official or admin.
--   3. Residents can read and create only their own incident reports; staff
--      (active officials/admins) can read all of them.

set search_path = public, pg_catalog;

-- ---------------------------------------------------------------------------
-- 1. Sign-up: strip role-like keys from self-supplied metadata
-- ---------------------------------------------------------------------------
-- raw_user_meta_data is fully controlled by whoever calls auth.signUp(). The
-- app never trusts it for authorization, but we also scrub role-like keys so
-- no future code path can be tricked by them. Accounts created by an admin
-- carry app_metadata.admin_managed = true (users cannot write app_metadata),
-- and keep their metadata untouched.
create or replace function public.scrub_self_signup_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'admin_managed', 'false') <> 'true' then
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
      - 'role' - 'app_role' - 'user_role' - 'barangay_role' - 'is_admin' - 'position';
  end if;
  return new;
end;
$$;
revoke all on function public.scrub_self_signup_metadata() from public, anon, authenticated;

drop trigger if exists before_auth_user_created_scrub on auth.users;
create trigger before_auth_user_created_scrub before insert on auth.users
for each row execute function public.scrub_self_signup_metadata();

-- Every new profile is a resident. The admin API upgrades the role afterwards
-- with the service role, which the protect_profile_privileges trigger allows.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), 'resident', true)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Browsers can never insert profiles or change role / is_active (re-asserted
-- here in case an older migration or dashboard tweak re-granted it).
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Role helpers for RLS policies
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles
  where id = (select auth.uid()) and is_active = true;
$$;
revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.is_active_resident()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'resident' and is_active = true
  );
$$;
revoke all on function public.is_active_resident() from public;
grant execute on function public.is_active_resident() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Incidents: residents see their own reports, staff see everything
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.incidents') is not null then
    -- Previously every signed-in account could read every report.
    drop policy if exists "Authenticated users can view incidents" on public.incidents;
    drop policy if exists "Reporters and staff can view incidents" on public.incidents;
    create policy "Reporters and staff can view incidents"
      on public.incidents for select to authenticated
      using (reporter_id = (select auth.uid()) or public.is_active_staff());

    -- Only active resident accounts file reports, and only as themselves.
    drop policy if exists "Residents can report incidents for themselves" on public.incidents;
    create policy "Residents can report incidents for themselves"
      on public.incidents for insert to authenticated
      with check (
        reporter_id = (select auth.uid())
        and public.is_active_resident()
        and status = 'pending'
        and (media_path is null or media_path like ((select auth.uid())::text || '/%'))
      );
  end if;
end;
$$;

comment on function public.current_app_role() is
  'Role of the signed-in account (null when inactive). Use in RLS policies instead of reading JWT or user metadata.';
