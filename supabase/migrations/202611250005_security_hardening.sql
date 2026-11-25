-- Security hardening for the AlertBarangay admin app.
-- Safe to re-run. Apply after 202611250004_maintenance_mode.sql.

set search_path = public, pg_catalog;

-- ---------------------------------------------------------------------------
-- 1. Shared role helpers
-- ---------------------------------------------------------------------------

-- Admins or officials whose accounts are still active.
create or replace function public.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'official') and is_active = true
  );
$$;
revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Profiles: browsers may never change role, active status or identity
-- ---------------------------------------------------------------------------

-- Column grants: signed-in users may only edit their own name and photo
-- (row access is still limited by the "own profile" RLS policy).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Defense in depth in case an older migration re-granted wider access.
-- Requests made with the publishable key run as "anon" or "authenticated";
-- the trusted server (service role) and the SQL editor are not affected.
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql set search_path = '' as $$
declare
  request_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if request_role in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.role is distinct from 'resident' then
      raise exception 'Only administrators can assign roles.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (
      new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
    ) then
      raise exception 'Only administrators can change roles or account status.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges before insert or update on public.profiles
for each row execute function public.protect_profile_privileges();

-- ---------------------------------------------------------------------------
-- 3. New-account notifications: trust only server-set app metadata
-- ---------------------------------------------------------------------------
-- raw_user_meta_data can be written by anyone at sign-up, so a self-registered
-- user could previously hide their account from the admin activity feed.
-- The admin API now sets app_metadata.admin_managed, which users cannot edit.

create or replace function public.notify_admin_of_new_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from auth.users
    where id = new.id and raw_app_meta_data ->> 'admin_managed' = 'true'
  ) then
    begin
      insert into public.admin_notifications (event_type, message, subject_id)
      values ('account.created', 'New account created: ' || coalesce(nullif(btrim(new.full_name), ''), 'New user'), new.id);
    exception when others then
      raise warning 'Unable to record account creation activity for profile %', new.id;
    end;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_admin_of_new_profile() from public;

-- ---------------------------------------------------------------------------
-- 4. Older resident-feature policies: require an ACTIVE admin
-- ---------------------------------------------------------------------------
-- These previously checked role = 'admin' only, so a disabled admin kept
-- database access until their session expired.

do $$
begin
  if to_regclass('public.community_announcements') is not null then
    drop policy if exists "Barangay admins can publish announcements" on public.community_announcements;
    create policy "Barangay admins can publish announcements"
      on public.community_announcements for insert to authenticated
      with check (auth.uid() = author_id and public.is_active_admin());
  end if;

  if to_regclass('public.community_posts') is not null then
    -- Moderation: active admins and officials can remove any community post.
    drop policy if exists "Staff can remove community posts" on public.community_posts;
    create policy "Staff can remove community posts"
      on public.community_posts for delete to authenticated
      using (public.is_active_staff());
  end if;

  if to_regclass('public.resident_messages') is not null then
    drop policy if exists "Barangay admins can read resident messages" on public.resident_messages;
    create policy "Barangay admins can read resident messages"
      on public.resident_messages for select to authenticated
      using (public.is_active_staff());
  end if;

  if to_regclass('public.appointment_subscriptions') is not null then
    drop policy if exists "Residents and barangay admins can view appointment subscriptions" on public.appointment_subscriptions;
    create policy "Residents and barangay admins can view appointment subscriptions"
      on public.appointment_subscriptions for select to authenticated
      using (auth.uid() = user_id or public.is_active_admin());
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Incidents: officials can update status; media is private to reporter/staff
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.incidents') is not null then
    -- Previously only admins could update status, so officials could not respond.
    drop policy if exists "Officials can update incident status" on public.incidents;
    create policy "Officials can update incident status"
      on public.incidents for update to authenticated
      using (public.is_active_staff())
      with check (public.is_active_staff());
  end if;
end;
$$;

-- Photos and videos of emergencies can show faces, homes and injuries.
-- Only the person who uploaded them and active staff may open them.
drop policy if exists "Incident media is readable by authenticated users" on storage.objects;
drop policy if exists "Incident media is readable by reporter and staff" on storage.objects;
create policy "Incident media is readable by reporter and staff"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'incident-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_active_staff()
    )
  );
