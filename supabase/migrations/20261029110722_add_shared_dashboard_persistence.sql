create table if not exists public.dashboard_settings (
  id text primary key default 'main' check (id = 'main'),
  name text not null default 'Captain Dela Cruz'
    check (char_length(btrim(name)) between 1 and 80),
  picture text not null default ''
    check (char_length(picture) <= 1500000),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'dispatched')),
  previous_status text check (previous_status in ('Pending', 'Assigned', 'In progress', 'Monitoring', 'Resolved', 'Closed')),
  new_status text check (new_status in ('Pending', 'Assigned', 'In progress', 'Monitoring', 'Resolved', 'Closed')),
  response_type text check (response_type in ('Medical', 'Fire', 'Rescue', 'Evacuation')),
  note text check (char_length(note) <= 500),
  actor_label text not null default 'Shared dashboard' check (actor_label = 'Shared dashboard'),
  created_at timestamptz not null default now(),
  constraint report_history_event_fields check (
    (event_type = 'created' and response_type is null and note is null)
    or (event_type = 'dispatched' and response_type is not null)
  )
);

create index if not exists report_history_report_created_idx
  on public.report_history (report_id, created_at asc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('report_created', 'report_dispatched', 'announcement_published')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  report_id uuid references public.reports(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint notifications_event_reference check (
    (event_type in ('report_created', 'report_dispatched') and report_id is not null and announcement_id is null)
    or (event_type = 'announcement_published' and report_id is null and announcement_id is not null)
  )
);

create index if not exists notifications_created_idx
  on public.notifications (created_at desc);

-- Existing reports get one initial history row. The notification trigger is
-- installed after this backfill so old reports do not appear as new alerts.
insert into public.report_history (report_id, event_type, new_status, created_at)
select r.id, 'created', r.status, r.created_at
from public.reports as r
where not exists (
  select 1
  from public.report_history as history
  where history.report_id = r.id
    and history.event_type = 'created'
);

alter table public.dashboard_settings enable row level security;
alter table public.report_history enable row level security;
alter table public.notifications enable row level security;

grant select, insert, update on public.dashboard_settings to anon, authenticated;
grant select on public.report_history to anon, authenticated;
grant select on public.notifications to anon, authenticated;

drop policy if exists "Anyone can read dashboard settings" on public.dashboard_settings;
create policy "Anyone can read dashboard settings"
  on public.dashboard_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can create dashboard settings" on public.dashboard_settings;
create policy "Anyone can create dashboard settings"
  on public.dashboard_settings for insert
  to anon, authenticated
  with check (id = 'main');

drop policy if exists "Anyone can update dashboard settings" on public.dashboard_settings;
create policy "Anyone can update dashboard settings"
  on public.dashboard_settings for update
  to anon, authenticated
  using (id = 'main')
  with check (id = 'main');

drop policy if exists "Anyone can read report history" on public.report_history;
create policy "Anyone can read report history"
  on public.report_history for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read notifications" on public.notifications;
create policy "Anyone can read notifications"
  on public.notifications for select
  to anon, authenticated
  using (true);

-- These narrow definer routines perform only trigger-derived writes. Their
-- empty search_path and qualified table references prevent object shadowing;
-- callers cannot invoke the trigger functions directly.
create or replace function public.record_report_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.report_history (report_id, event_type, new_status)
  values (new.id, 'created', new.status);
  return new;
end;
$$;

create or replace function public.notify_report_history_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports%rowtype;
begin
  select r.* into v_report
  from public.reports as r
  where r.id = new.report_id;

  if new.event_type = 'created' then
    insert into public.notifications (event_type, title, body, report_id)
    values (
      'report_created',
      'New report submitted',
      v_report.report_code || ' · ' || v_report.type || ' at ' || v_report.location,
      v_report.id
    );
  else
    insert into public.notifications (event_type, title, body, report_id)
    values (
      'report_dispatched',
      'Response dispatched',
      new.response_type || ' response assigned to ' || v_report.report_code,
      v_report.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (event_type, title, body, announcement_id)
  values (
    'announcement_published',
    'New announcement: ' || new.title,
    new.body,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists reports_record_created on public.reports;
create trigger reports_record_created
  after insert on public.reports
  for each row execute function public.record_report_created();

drop trigger if exists report_history_create_notification on public.report_history;
create trigger report_history_create_notification
  after insert on public.report_history
  for each row execute function public.notify_report_history_event();

drop trigger if exists announcements_create_notification on public.announcements;
create trigger announcements_create_notification
  after insert on public.announcements
  for each row execute function public.notify_announcement_published();

revoke all on function public.record_report_created() from public, anon, authenticated;
revoke all on function public.notify_report_history_event() from public, anon, authenticated;
revoke all on function public.notify_announcement_published() from public, anon, authenticated;

create or replace function public.dispatch_report(
  p_report_id uuid,
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
  if p_response_type not in ('Medical', 'Fire', 'Rescue', 'Evacuation') then
    raise exception 'Unsupported response type.' using errcode = '22023';
  end if;

  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Dispatch note is too long.' using errcode = '22023';
  end if;

  select r.status into v_previous_status
  from public.reports as r
  where r.id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;

  if v_previous_status in ('Resolved', 'Closed') then
    raise exception 'Resolved or closed reports cannot be dispatched.' using errcode = '22023';
  end if;

  update public.reports
  set status = 'Assigned'
  where id = p_report_id;

  insert into public.report_history (
    report_id,
    event_type,
    previous_status,
    new_status,
    response_type,
    note,
    actor_label
  )
  values (
    p_report_id,
    'dispatched',
    v_previous_status,
    'Assigned',
    p_response_type,
    nullif(btrim(p_note), ''),
    'Shared dashboard'
  )
  returning * into v_history;

  return v_history;
end;
$$;

revoke all on function public.dispatch_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.dispatch_report(uuid, text, text) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
