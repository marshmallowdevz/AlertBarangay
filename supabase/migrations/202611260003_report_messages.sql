-- Private messages on an incident report, between the resident who filed it
-- and barangay staff. Safe to re-run. Apply after
-- 202611260002_resident_only_signup_and_role_rls.sql.
--
-- Privacy: a message row stores only the sender's account id and role. The
-- apps show "Barangay official" or "Resident" as the sender, so neither side
-- sees the other's email address or phone number.

set search_path = public, pg_catalog;

create table if not exists public.incident_messages (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null default auth.uid(),
  sender_role text not null default 'resident' check (sender_role in ('resident', 'official', 'admin')),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists incident_messages_incident_created_idx
  on public.incident_messages (incident_id, created_at);
create index if not exists incident_messages_created_idx
  on public.incident_messages (created_at desc);

-- Sender and role are always set by the database from the signed-in account,
-- whatever the browser sends.
create or replace function public.stamp_incident_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
begin
  if (select auth.uid()) is null then
    return new; -- trusted server / SQL editor
  end if;
  select p.role into v_role
  from public.profiles as p
  where p.id = (select auth.uid()) and p.is_active = true;
  if v_role is null then
    raise exception 'Your account is not active.' using errcode = '42501';
  end if;
  new.sender_id := (select auth.uid());
  new.sender_role := v_role;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function public.stamp_incident_message() from public, anon, authenticated;

drop trigger if exists incident_messages_stamp on public.incident_messages;
create trigger incident_messages_stamp before insert on public.incident_messages
for each row execute function public.stamp_incident_message();

alter table public.incident_messages enable row level security;
revoke all on public.incident_messages from public, anon, authenticated;
grant select on public.incident_messages to authenticated;
grant insert (incident_id, body) on public.incident_messages to authenticated;

drop policy if exists "Reporter and staff can read report messages" on public.incident_messages;
create policy "Reporter and staff can read report messages"
  on public.incident_messages for select to authenticated
  using (
    public.is_active_staff()
    or exists (
      select 1 from public.incidents as i
      where i.id = incident_id and i.reporter_id = (select auth.uid())
    )
  );

drop policy if exists "Reporter and staff can send report messages" on public.incident_messages;
create policy "Reporter and staff can send report messages"
  on public.incident_messages for insert to authenticated
  with check (
    public.is_active_staff()
    or (
      public.is_active_resident()
      and exists (
        select 1 from public.incidents as i
        where i.id = incident_id and i.reporter_id = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Notifications for new messages (uses the shared notifications table from
-- 20261125011318_shared_report_progress_access.sql)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.notifications') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'notifications' and column_name = 'incident_id') then
    alter table public.notifications
      drop constraint if exists notifications_event_type_check,
      drop constraint if exists notifications_event_reference;
    alter table public.notifications
      add constraint notifications_event_type_check check (event_type in (
        'report_created', 'report_dispatched', 'announcement_published',
        'incident_created', 'incident_status_changed', 'incident_message', 'legacy'
      )),
      add constraint notifications_event_reference check (
        (event_type in ('report_created', 'report_dispatched') and report_id is not null and announcement_id is null and incident_id is null)
        or (event_type = 'announcement_published' and report_id is null and announcement_id is not null and incident_id is null)
        or (event_type in ('incident_created', 'incident_status_changed', 'incident_message') and report_id is null and announcement_id is null and incident_id is not null)
        or (event_type = 'legacy' and report_id is null and announcement_id is null and incident_id is null)
      );
  end if;
end;
$$;

create or replace function public.notify_incident_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_incident record;
  v_preview text := left(regexp_replace(new.body, '\s+', ' ', 'g'), 140);
begin
  select i.id, i.eid, i.reporter_id into v_incident from public.incidents as i where i.id = new.incident_id;
  if v_incident.id is null then return new; end if;
  begin
    if new.sender_role in ('official', 'admin') then
      -- Staff wrote: tell the resident who filed the report.
      if v_incident.reporter_id is not null then
        insert into public.notifications (event_type, title, body, incident_id, recipient_id, user_id, message, audience, read)
        values ('incident_message', 'New message about ' || v_incident.eid, v_preview, v_incident.id,
          v_incident.reporter_id, v_incident.reporter_id, 'New message about ' || v_incident.eid || ': ' || v_preview, 'officials', false);
      end if;
    else
      -- Resident wrote: tell barangay staff.
      insert into public.notifications (event_type, title, body, incident_id, recipient_id, user_id, message, audience, read)
      values ('incident_message', 'Resident replied on ' || v_incident.eid, v_preview, v_incident.id,
        null, null, 'Resident replied on ' || v_incident.eid || ': ' || v_preview, 'officials', false);
    end if;
  exception when others then
    -- Never block a message because the notification could not be written.
    raise warning 'Could not record message notification for incident %', new.incident_id;
  end;
  return new;
end;
$$;
revoke all on function public.notify_incident_message() from public, anon, authenticated;

drop trigger if exists incident_messages_notify on public.incident_messages;
create trigger incident_messages_notify after insert on public.incident_messages
for each row execute function public.notify_incident_message();

-- Live updates for the chat threads.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'incident_messages'
     ) then
    alter publication supabase_realtime add table public.incident_messages;
  end if;
end;
$$;


-- Residents' notification bell listens for new rows live.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and to_regclass('public.notifications') is not null
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

notify pgrst, 'reload schema';
