-- Give the officials dashboard and resident app one shared incident and
-- notification flow. All client access remains authenticated and RLS-backed.

-- Official dashboard identities use a trusted app_metadata claim. This keeps
-- the dashboard's authorization rule aligned with AuthApp's official gate.
drop policy if exists "Officials can update incident status" on public.incidents;
create policy "Officials can update incident status"
  on public.incidents for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'official')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'official');

-- The legacy dashboard dispatch RPC used to allow anonymous calls. Keep the
-- shared report flow restricted to the same trusted official claim.
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
  if (select auth.uid()) is null
    or (select auth.jwt() -> 'app_metadata' ->> 'barangay_role') is distinct from 'official' then
    raise exception 'Only barangay officials can dispatch responses.' using errcode = '42501';
  end if;

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
    report_id, event_type, previous_status, new_status,
    response_type, note, actor_label
  )
  values (
    p_report_id, 'dispatched', v_previous_status, 'Assigned',
    p_response_type, nullif(btrim(p_note), ''), 'Shared dashboard'
  )
  returning * into v_history;

  return v_history;
end;
$$;

revoke all on function public.dispatch_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.dispatch_report(uuid, text, text) to authenticated;

-- Announcements generate shared notifications, so only authenticated officials
-- may create, edit, or remove them. Reading published announcements stays open.
revoke insert, update, delete on public.announcements from public, anon;
grant insert, update, delete on public.announcements to authenticated;

drop policy if exists "Anyone can post announcements" on public.announcements;
drop policy if exists "Open dashboard can update announcements" on public.announcements;
drop policy if exists "Officials can update announcements" on public.announcements;
drop policy if exists "Open dashboard can delete announcements" on public.announcements;
drop policy if exists "Anyone can delete announcements" on public.announcements;
drop policy if exists "Officials can delete announcements" on public.announcements;

create policy "Officials can post announcements"
  on public.announcements for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'official');

create policy "Officials can update announcements"
  on public.announcements for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'official')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'official');

create policy "Officials can delete announcements"
  on public.announcements for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'official');

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
create policy "Users can read incident dispatches they are allowed to see"
  on public.incident_dispatches for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'official'
    or exists (
      select 1 from public.incidents as i
      where i.id = incident_id
        and i.reporter_id = (select auth.uid())
    )
  );

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
  if (select auth.uid()) is null
    or (select auth.jwt() -> 'app_metadata' ->> 'barangay_role') is distinct from 'official' then
    raise exception 'Only barangay officials can dispatch incident responses.' using errcode = '42501';
  end if;

  if p_response_type not in ('Medical', 'Fire', 'Rescue', 'Evacuation') then
    raise exception 'Unsupported response type.' using errcode = '22023';
  end if;

  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Dispatch note is too long.' using errcode = '22023';
  end if;

  select i.status into v_status
  from public.incidents as i
  where i.id = p_incident_id
  for update;

  if not found then
    raise exception 'Incident not found.' using errcode = 'P0002';
  end if;

  if v_status = 'resolved' then
    raise exception 'Resolved incidents cannot be dispatched.' using errcode = '22023';
  end if;

  update public.incidents
  set status = 'responding'
  where id = p_incident_id;

  insert into public.incident_dispatches (incident_id, official_id, response_type, note)
  values (p_incident_id, (select auth.uid()), p_response_type, nullif(btrim(p_note), ''))
  returning * into v_dispatch;

  return v_dispatch;
end;
$$;

revoke all on function public.dispatch_incident(uuid, text, text) from public, anon, authenticated;
grant execute on function public.dispatch_incident(uuid, text, text) to authenticated;

-- Residents and officials use the same notification payload. Incident reports
-- alert officials; status changes alert the reporter and officials.
alter table public.notifications
  add column if not exists incident_id uuid references public.incidents(id) on delete cascade,
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists audience text not null default 'all';

alter table public.notifications
  drop constraint if exists notifications_event_type_check,
  drop constraint if exists notifications_event_reference,
  drop constraint if exists notifications_audience_check;

alter table public.notifications
  add constraint notifications_event_type_check
    check (event_type in (
      'report_created',
      'report_dispatched',
      'announcement_published',
      'incident_created',
      'incident_status_changed'
    )),
  add constraint notifications_event_reference check (
    (
      event_type in ('report_created', 'report_dispatched')
      and report_id is not null
      and announcement_id is null
      and incident_id is null
    )
    or (
      event_type = 'announcement_published'
      and report_id is null
      and announcement_id is not null
      and incident_id is null
    )
    or (
      event_type in ('incident_created', 'incident_status_changed')
      and report_id is null
      and announcement_id is null
      and incident_id is not null
    )
  ),
  add constraint notifications_audience_check
    check (audience in ('all', 'officials'));

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc)
  where recipient_id is not null;

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;

drop policy if exists "Anyone can read notifications" on public.notifications;
drop policy if exists "Users can read visible notifications" on public.notifications;
create policy "Users can read visible notifications"
  on public.notifications for select
  to authenticated
  using (
    audience = 'all'
    or recipient_id = (select auth.uid())
    or (
      audience = 'officials'
      and (select auth.jwt() -> 'app_metadata' ->> 'barangay_role') = 'official'
    )
  );

-- Read state belongs to a resident, never to the shared notification row.
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
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
  on public.notification_reads for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.notifications as n
      where n.id = notification_id
    )
  );

drop policy if exists "Users can mark visible notifications as read" on public.notification_reads;
create policy "Users can mark visible notifications as read"
  on public.notification_reads for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.notifications as n
      where n.id = notification_id
    )
  );

drop policy if exists "Users can update their notification receipts" on public.notification_reads;
create policy "Users can update their notification receipts"
  on public.notification_reads for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.notifications as n
      where n.id = notification_id
    )
  );

create or replace function public.notify_incident_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (
      event_type, title, body, incident_id, audience
    )
    values (
      'incident_created',
      'New incident reported',
      new.eid || ' · ' || initcap(replace(new.type, '_', ' '))
        || ' at ' || round(new.lat::numeric, 6)::text || ', ' || round(new.lng::numeric, 6)::text,
      new.id,
      'officials'
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.notifications (
      event_type, title, body, incident_id, recipient_id, audience
    )
    values (
      'incident_status_changed',
      'Incident status updated',
      new.eid || ' is now ' || initcap(new.status) || '.',
      new.id,
      new.reporter_id,
      'officials'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_incident_change() from public, anon, authenticated;
drop trigger if exists incidents_create_notification on public.incidents;
create trigger incidents_create_notification
  after insert on public.incidents
  for each row execute function public.notify_incident_change();

drop trigger if exists incidents_status_notification on public.incidents;
create trigger incidents_status_notification
  after update of status on public.incidents
  for each row execute function public.notify_incident_change();

-- Community posts live in their own private bucket. The signed-in feed can
-- read media, while uploads and deletes stay inside each resident's folder.
alter table public.community_posts
  add column if not exists media_path text,
  add column if not exists media_type text;

alter table public.community_posts
  alter column media_url drop not null;

alter table public.community_posts
  drop constraint if exists community_posts_media_type_check;
alter table public.community_posts
  add constraint community_posts_media_type_check
  check (media_type is null or media_type in ('image', 'video'));

alter table public.community_posts enable row level security;
revoke all on public.community_posts from public, anon, authenticated;
grant select, insert, delete on public.community_posts to authenticated;

drop policy if exists "Signed-in residents can view community posts" on public.community_posts;
create policy "Signed-in residents can view community posts"
  on public.community_posts for select
  to authenticated
  using (true);

drop policy if exists "Residents can publish their own community posts" on public.community_posts;
create policy "Residents can publish their own community posts"
  on public.community_posts for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (media_path is null or media_path like ((select auth.uid())::text || '/%'))
  );

drop policy if exists "Residents can delete their own community posts" on public.community_posts;
create policy "Residents can delete their own community posts"
  on public.community_posts for delete
  to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  false,
  41943040,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Residents can view community media" on storage.objects;
create policy "Residents can view community media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'community-media');

drop policy if exists "Residents can upload their own community media" on storage.objects;
create policy "Residents can upload their own community media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Residents can delete their own community media" on storage.objects;
create policy "Residents can delete their own community media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'community_posts'
    ) then
      alter publication supabase_realtime add table public.community_posts;
    end if;
  end if;
end;
$$;
