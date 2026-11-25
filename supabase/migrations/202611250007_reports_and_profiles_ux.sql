-- Resident/official experience improvements. Safe to re-run.
-- Apply after 202611250005_security_hardening.sql (needs public.is_active_staff()).

set search_path = public, pg_catalog;

-- ---------------------------------------------------------------------------
-- 1. Incidents: allow a typed address when GPS is unavailable
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.incidents') is not null then
    alter table public.incidents add column if not exists location_text text;

    if not exists (select 1 from pg_constraint where conrelid = 'public.incidents'::regclass and conname = 'incidents_location_text_length') then
      alter table public.incidents add constraint incidents_location_text_length
        check (location_text is null or char_length(btrim(location_text)) between 3 and 200);
    end if;

    alter table public.incidents alter column lat drop not null;
    alter table public.incidents alter column lng drop not null;

    -- Every report needs GPS coordinates (both) or a typed address.
    if not exists (select 1 from pg_constraint where conrelid = 'public.incidents'::regclass and conname = 'incidents_has_location') then
      alter table public.incidents add constraint incidents_has_location
        check ((lat is not null and lng is not null) or location_text is not null);
    end if;
    if not exists (select 1 from pg_constraint where conrelid = 'public.incidents'::regclass and conname = 'incidents_coordinates_paired') then
      alter table public.incidents add constraint incidents_coordinates_paired
        check ((lat is null) = (lng is null));
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Officials can see who reported an incident
-- ---------------------------------------------------------------------------
drop policy if exists "Active staff can read profiles" on public.profiles;
create policy "Active staff can read profiles" on public.profiles
  for select to authenticated using (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- 3. Profile photos must come from this project's profile-photos bucket
-- ---------------------------------------------------------------------------
-- Stops users pointing avatar_url at an arbitrary outside URL (for example a
-- tracking pixel that other users' browsers would load). NOT VALID keeps any
-- older rows untouched while enforcing the rule for every new change.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_avatar_url_from_storage') then
    alter table public.profiles add constraint profiles_avatar_url_from_storage
      check (avatar_url is null or avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/profile-photos/[0-9a-f-]{36}/[A-Za-z0-9._-]+$')
      not valid;
  end if;
end;
$$;
