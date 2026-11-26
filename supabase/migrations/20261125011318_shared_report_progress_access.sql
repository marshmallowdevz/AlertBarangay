-- Keep profile roles database-controlled, and give verified barangay staff
-- access to the shared resident reports and their response history.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_barangay_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      (select auth.jwt() -> 'app_metadata' ->> 'barangay_role') in ('official', 'admin')
      or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('official', 'admin')
      or exists (
        select 1
        from public.profiles as p
        where p.id = (select auth.uid())
          and p.role in ('official', 'admin')
      )
    );
$$;
revoke all on function private.is_barangay_staff() from public, anon, authenticated;
grant execute on function private.is_barangay_staff() to authenticated;

-- Profile role was editable by a signed-in user. Keep name/avatar editing,
-- but only a trusted database operator can grant staff access.
alter table public.profiles alter column role set default 'resident';
alter table public.profiles enable row level security;
revoke insert, update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

drop policy if exists "Read own profile" on public.profiles;
create policy "Residents and staff can read profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_barangay_staff()));

drop policy if exists "Insert own profile" on public.profiles;
create policy "Residents can create their own resident profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'resident');

drop policy if exists "Update own profile" on public.profiles;
create policy "Users can update their own profile details"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- The resident and barangay dashboard use the same legacy reports table.
alter table public.reports enable row level security;
grant select, insert, delete on public.reports to authenticated;
revoke update on public.reports from authenticated;
grant update (status) on public.reports to authenticated;

drop policy if exists "Read own reports" on public.reports;
create policy "Residents and staff can read reports"
  on public.reports for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_barangay_staff()));

drop policy if exists "Admins update reports" on public.reports;
create policy "Staff can update report status"
  on public.reports for update to authenticated
  using ((select private.is_barangay_staff()))
  with check ((select private.is_barangay_staff()));

-- Extend the existing status-only history table without replacing its IDs or
-- breaking clients that still read the old status column.
alter table public.report_history
  add column if not exists event_type text,
  add column if not exists previous_status text,
  add column if not exists new_status text,
  add column if not exists response_type text,
  add column if not exists note text,
  add column if not exists actor_label text;

alter table public.report_history
  drop constraint if exists report_history_event_type_check,
  drop constraint if exists report_history_event_fields;

update public.report_history
set event_type = coalesce(event_type, case when response_type is not null then 'dispatched' else 'status_changed' end),
    new_status = coalesce(new_status, status),
    actor_label = coalesce(actor_label, 'Shared dashboard');

alter table public.report_history
  alter column event_type set default 'status_changed',
  alter column event_type set not null,
  alter column actor_label set default 'Shared dashboard',
  alter column actor_label set not null;

alter table public.report_history
  add constraint report_history_event_type_check
    check (event_type in ('created', 'dispatched', 'status_changed')),
  add constraint report_history_event_fields check (
    (event_type = 'created' and response_type is null and note is null)
    or (event_type = 'dispatched' and response_type is not null)
    or (event_type = 'status_changed' and response_type is null)
  );

create index if not exists report_history_report_created_idx
  on public.report_history (report_id, created_at asc);
alter table public.report_history enable row level security;
revoke all on public.report_history from anon, authenticated;
grant select on public.report_history to authenticated;

drop policy if exists "Read history of own reports" on public.report_history;
drop policy if exists "Anyone can read report history" on public.report_history;
create policy "Residents and staff can read report history"
  on public.report_history for select to authenticated
  using (
    (select private.is_barangay_staff())
    or exists (
      select 1 from public.reports as r
      where r.id = report_id and r.user_id = (select auth.uid())
    )
  );

insert into public.report_history (report_id, event_type, new_status, status, actor_label, created_at)
select r.id, 'created', r.status, r.status, 'Shared dashboard', r.created_at
from public.reports as r
where not exists (
  select 1 from public.report_history as h
  where h.report_id = r.id and h.event_type = 'created'
);

create or replace function public.log_report_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.report_history (report_id, status, event_type, new_status, actor_label)
    values (new.id, new.status, 'created', new.status, 'Shared dashboard');
  elsif new.status is distinct from old.status then
    insert into public.report_history (report_id, status, event_type, previous_status, new_status, actor_label)
    values (new.id, new.status, 'status_changed', old.status, new.status, 'Shared dashboard');
  end if;
  return new;
end;
$$;
revoke all on function public.log_report_status() from public, anon, authenticated;

create or replace function public.dispatch_report(
  p_report_id bigint,
  p_response_type text,
  p_note text
)
returns public.report_history
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status text;
  v_history public.report_history;
begin
  if not private.is_barangay_staff() then
    raise exception 'Only barangay officials and admins can dispatch responses.' using errcode = '42501';
  end if;
  if p_response_type not in ('Medical', 'Fire', 'Rescue', 'Evacuation') then
    raise exception 'Unsupported response type.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Dispatch note is too long.' using errcode = '22023';
  end if;

  select r.status into v_previous_status
  from public.reports as r where r.id = p_report_id for update;
  if not found then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;
  if v_previous_status in ('Resolved', 'Closed') then
    raise exception 'Resolved or closed reports cannot be dispatched.' using errcode = '22023';
  end if;

  update public.reports set status = 'Assigned' where id = p_report_id;
  insert into public.report_history (
    report_id, status, event_type, previous_status, new_status,
    response_type, note, actor_label
  ) values (
    p_report_id, 'Assigned', 'dispatched', v_previous_status, 'Assigned',
    p_response_type, nullif(btrim(p_note), ''), 'Shared dashboard'
  ) returning * into v_history;
  return v_history;
end;
$$;
revoke all on function public.dispatch_report(bigint, text, text) from public, anon, authenticated;
grant execute on function public.dispatch_report(bigint, text, text) to authenticated;

-- Create the incident response table expected by the desktop dashboard.
create table if not exists public.incident_dispatches (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  official_id uuid not null references auth.users(id) on delete cascade,
  response_type text not null check (response_type in ('Medical', 'Fire', 'Rescue', 'Evacuation')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists incident_dispatches_incident_created_idx
  on public.incident_dispatches (incident_id, created_at asc);
alter table public.incident_dispatches enable row level security;
revoke all on public.incident_dispatches from public, anon, authenticated;
grant select on public.incident_dispatches to authenticated;

drop policy if exists "Users can read incident dispatches they are allowed to see" on public.incident_dispatches;
create policy "Residents and staff can read incident dispatches"
  on public.incident_dispatches for select to authenticated
  using (
    (select private.is_barangay_staff())
    or exists (
      select 1 from public.incidents as i
      where i.id = incident_id and i.reporter_id = (select auth.uid())
    )
  );

create table if not exists public.incident_status_history (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  previous_status text,
  new_status text not null check (new_status in ('pending', 'responding', 'resolved')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'system' check (actor_role in ('resident', 'official', 'admin', 'system')),
  created_at timestamptz not null default now()
);
create index if not exists incident_status_history_incident_created_idx
  on public.incident_status_history (incident_id, created_at asc);
alter table public.incident_status_history enable row level security;
revoke all on public.incident_status_history from public, anon, authenticated;
grant select on public.incident_status_history to authenticated;

drop policy if exists "Residents and staff can read incident status history" on public.incident_status_history;
create policy "Residents and staff can read incident status history"
  on public.incident_status_history for select to authenticated
  using (
    (select private.is_barangay_staff())
    or exists (
      select 1 from public.incidents as i
      where i.id = incident_id and i.reporter_id = (select auth.uid())
    )
  );

insert into public.incident_status_history (incident_id, new_status, actor_id, actor_role, created_at)
select i.id, i.status, i.reporter_id, 'resident', i.created_at
from public.incidents as i
where not exists (
  select 1 from public.incident_status_history as h
  where h.incident_id = i.id
);

create or replace function private.log_incident_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
begin
  if tg_op = 'INSERT' then
    insert into public.incident_status_history (incident_id, new_status, actor_id, actor_role, created_at)
    values (new.id, new.status, coalesce((select auth.uid()), new.reporter_id), 'resident', new.created_at);
  elsif new.status is distinct from old.status then
    if (select auth.uid()) is null then
      v_actor_role := 'system';
    elsif (select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'admin'
      or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin') then
      v_actor_role := 'admin';
    elsif (select private.is_barangay_staff()) then
      v_actor_role := 'official';
    else
      v_actor_role := 'resident';
    end if;
    insert into public.incident_status_history (incident_id, previous_status, new_status, actor_id, actor_role)
    values (new.id, old.status, new.status, (select auth.uid()), v_actor_role);
  end if;
  return new;
end;
$$;
revoke all on function private.log_incident_status() from public, anon, authenticated;
drop trigger if exists incidents_log_status_history on public.incidents;
create trigger incidents_log_status_history
  after insert or update of status on public.incidents
  for each row execute function private.log_incident_status();

drop policy if exists "Officials can update incident status" on public.incidents;
drop policy if exists "Barangay staff can update incident status" on public.incidents;
create policy "Barangay staff can update incident status"
  on public.incidents for update to authenticated
  using ((select private.is_barangay_staff()))
  with check ((select private.is_barangay_staff()));
revoke update on public.incidents from authenticated;
grant update (status) on public.incidents to authenticated;

create or replace function public.dispatch_incident(
  p_incident_id uuid,
  p_response_type text,
  p_note text
)
returns public.incident_dispatches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_dispatch public.incident_dispatches;
begin
  if not private.is_barangay_staff() then
    raise exception 'Only barangay officials and admins can dispatch incident responses.' using errcode = '42501';
  end if;
  if p_response_type not in ('Medical', 'Fire', 'Rescue', 'Evacuation') then
    raise exception 'Unsupported response type.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Dispatch note is too long.' using errcode = '22023';
  end if;

  select i.status into v_status
  from public.incidents as i where i.id = p_incident_id for update;
  if not found then
    raise exception 'Incident not found.' using errcode = 'P0002';
  end if;
  if v_status = 'resolved' then
    raise exception 'Resolved incidents cannot be dispatched.' using errcode = '22023';
  end if;

  update public.incidents set status = 'responding' where id = p_incident_id;
  insert into public.incident_dispatches (incident_id, official_id, response_type, note)
  values (p_incident_id, (select auth.uid()), p_response_type, nullif(btrim(p_note), ''))
  returning * into v_dispatch;
  return v_dispatch;
end;
$$;
revoke all on function public.dispatch_incident(uuid, text, text) from public, anon, authenticated;
grant execute on function public.dispatch_incident(uuid, text, text) to authenticated;

-- Add the newer shared notification fields but keep the old columns and IDs so
-- the other resident/dashboard clients can continue reading their old rows.
alter table public.notifications
  add column if not exists event_type text not null default 'legacy',
  add column if not exists title text not null default 'Notification',
  add column if not exists body text not null default '',
  add column if not exists report_id bigint references public.reports(id) on delete cascade,
  add column if not exists announcement_id uuid references public.announcements(id) on delete cascade,
  add column if not exists incident_id uuid references public.incidents(id) on delete cascade,
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists audience text not null default 'legacy';

alter table public.notifications
  alter column user_id drop not null,
  alter column message drop not null,
  alter column read set default false;

update public.notifications
set recipient_id = coalesce(recipient_id, user_id),
    event_type = coalesce(event_type, 'legacy'),
    title = coalesce(nullif(title, ''), 'Notification'),
    body = coalesce(nullif(body, ''), message, ''),
    audience = case when event_type is null or event_type = 'legacy' then 'legacy' else audience end;

alter table public.notifications
  drop constraint if exists notifications_event_type_check,
  drop constraint if exists notifications_event_reference,
  drop constraint if exists notifications_audience_check;
alter table public.notifications
  add constraint notifications_event_type_check check (event_type in (
    'report_created', 'report_dispatched', 'announcement_published',
    'incident_created', 'incident_status_changed', 'legacy'
  )),
  add constraint notifications_event_reference check (
    (event_type in ('report_created', 'report_dispatched') and report_id is not null and announcement_id is null and incident_id is null)
    or (event_type = 'announcement_published' and report_id is null and announcement_id is not null and incident_id is null)
    or (event_type in ('incident_created', 'incident_status_changed') and report_id is null and announcement_id is null and incident_id is not null)
    or (event_type = 'legacy' and report_id is null and announcement_id is null and incident_id is null)
  ),
  add constraint notifications_audience_check check (audience in ('all', 'officials', 'legacy'));

create index if not exists notifications_created_idx on public.notifications (created_at desc);
create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc) where recipient_id is not null;
alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select, insert, update (read), delete on public.notifications to authenticated;

drop policy if exists "Create own notifications" on public.notifications;
drop policy if exists "Delete own notifications" on public.notifications;
drop policy if exists "Read own notifications" on public.notifications;
drop policy if exists "Update own notifications" on public.notifications;
drop policy if exists "Anyone can read notifications" on public.notifications;
drop policy if exists "Users can read visible notifications" on public.notifications;
create policy "Users can read shared and personal notifications"
  on public.notifications for select to authenticated
  using (
    (audience = 'all' and (recipient_id is null or recipient_id = (select auth.uid())))
    or recipient_id = (select auth.uid())
    or (audience = 'officials' and (select private.is_barangay_staff()))
    or (audience = 'legacy' and user_id = (select auth.uid()))
  );
create policy "Residents can create legacy notifications"
  on public.notifications for insert to authenticated
  with check (
    event_type = 'legacy' and audience = 'legacy'
    and user_id = (select auth.uid()) and recipient_id = (select auth.uid())
  );
create policy "Residents can update their legacy notification read state"
  on public.notifications for update to authenticated
  using (event_type = 'legacy' and user_id = (select auth.uid()))
  with check (event_type = 'legacy' and audience = 'legacy' and user_id = (select auth.uid()));
create policy "Residents can delete their legacy notifications"
  on public.notifications for delete to authenticated
  using (event_type = 'legacy' and user_id = (select auth.uid()));

create table if not exists public.notification_reads (
  notification_id bigint not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);
create index if not exists notification_reads_user_notification_idx
  on public.notification_reads (user_id, notification_id);
alter table public.notification_reads enable row level security;
revoke all on public.notification_reads from public, anon, authenticated;
grant select, insert, update on public.notification_reads to authenticated;
drop policy if exists "Users can read their notification receipts" on public.notification_reads;
create policy "Users can read their notification receipts"
  on public.notification_reads for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Users can mark visible notifications as read" on public.notification_reads;
create policy "Users can mark visible notifications as read"
  on public.notification_reads for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notifications n where n.id = notification_id)
  );
drop policy if exists "Users can update their notification receipts" on public.notification_reads;
create policy "Users can update their notification receipts"
  on public.notification_reads for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notifications n where n.id = notification_id)
  );

create or replace function private.normalize_legacy_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.event_type = 'legacy' then
    new.user_id := coalesce(new.user_id, (select auth.uid()));
    new.recipient_id := coalesce(new.recipient_id, new.user_id);
    new.audience := 'legacy';
    new.title := coalesce(nullif(new.title, ''), 'Notification');
    new.body := coalesce(nullif(new.body, ''), new.message, '');
    new.message := coalesce(new.message, new.body);
    new.read := coalesce(new.read, false);
  end if;
  return new;
end;
$$;
revoke all on function private.normalize_legacy_notification() from public, anon, authenticated;
drop trigger if exists notifications_normalize_legacy on public.notifications;
create trigger notifications_normalize_legacy
  before insert on public.notifications
  for each row execute function private.normalize_legacy_notification();

create or replace function private.notify_report_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event text;
  v_title text;
  v_body text;
  v_recipient uuid;
begin
  if tg_op = 'INSERT' then
    v_event := 'report_created';
    v_title := 'New report submitted';
    v_body := coalesce(new.report_code, 'Report #' || new.id::text) || ' · ' || new.type || ' at ' || new.location;
    v_recipient := null;
  elsif new.status is distinct from old.status then
    v_event := 'report_dispatched';
    v_title := 'Report status updated';
    v_body := coalesce(new.report_code, 'Report #' || new.id::text) || ' is now ' || new.status || '.';
    v_recipient := new.user_id;
  else
    return new;
  end if;
  insert into public.notifications (event_type, title, body, report_id, recipient_id, user_id, message, audience, read)
  values (v_event, v_title, v_body, new.id, v_recipient, v_recipient, v_title || ': ' || v_body, 'officials', false);
  return new;
end;
$$;
revoke all on function private.notify_report_change() from public, anon, authenticated;
drop trigger if exists reports_shared_notifications on public.reports;
create trigger reports_shared_notifications
  after insert or update of status on public.reports
  for each row execute function private.notify_report_change();

create or replace function private.notify_incident_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event text;
  v_title text;
  v_body text;
  v_recipient uuid;
begin
  if tg_op = 'INSERT' then
    v_event := 'incident_created';
    v_title := 'New incident reported';
    v_body := new.eid || ' · ' || initcap(replace(new.type, '_', ' ')) || ' at '
      || round(new.lat::numeric, 6)::text || ', ' || round(new.lng::numeric, 6)::text;
    v_recipient := null;
  elsif new.status is distinct from old.status then
    v_event := 'incident_status_changed';
    v_title := 'Incident status updated';
    v_body := new.eid || ' is now ' || initcap(new.status) || '.';
    v_recipient := new.reporter_id;
  else
    return new;
  end if;
  insert into public.notifications (event_type, title, body, incident_id, recipient_id, user_id, message, audience, read)
  values (v_event, v_title, v_body, new.id, v_recipient, v_recipient, v_title || ': ' || v_body, 'officials', false);
  return new;
end;
$$;
revoke all on function private.notify_incident_change() from public, anon, authenticated;
drop trigger if exists incidents_shared_notifications on public.incidents;
create trigger incidents_shared_notifications
  after insert or update of status on public.incidents
  for each row execute function private.notify_incident_change();

create or replace function private.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (event_type, title, body, announcement_id, message, audience, read)
  values ('announcement_published', 'New announcement: ' || new.title, new.body, new.id,
    'New announcement: ' || new.title || ' · ' || new.body, 'all', false);
  return new;
end;
$$;
revoke all on function private.notify_announcement_published() from public, anon, authenticated;
drop trigger if exists announcements_shared_notifications on public.announcements;
create trigger announcements_shared_notifications
  after insert on public.announcements
  for each row execute function private.notify_announcement_published();

-- Keep report and notification updates visible to the desktop dashboard.
do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array['reports', 'incidents', 'notifications'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end;
$$;

-- Keep the existing signed-in is_admin() RPC available to older clients, but
-- remove its anonymous entry point now that report RLS uses the private helper.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
notify pgrst, 'reload schema';
