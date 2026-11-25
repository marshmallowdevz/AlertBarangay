create table if not exists public.dashboard_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  picture text not null default '' check (char_length(picture) <= 1500000),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_profiles enable row level security;
revoke all on table public.dashboard_profiles from anon, authenticated;
grant select, insert, update on table public.dashboard_profiles to authenticated;

drop policy if exists "Users can read their own dashboard profile" on public.dashboard_profiles;
create policy "Users can read their own dashboard profile"
  on public.dashboard_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own dashboard profile" on public.dashboard_profiles;
create policy "Users can create their own dashboard profile"
  on public.dashboard_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own dashboard profile" on public.dashboard_profiles;
create policy "Users can update their own dashboard profile"
  on public.dashboard_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.dashboard_settings
  add column if not exists emergency_phone text not null default '911'
    check (char_length(btrim(emergency_phone)) between 1 and 40),
  add column if not exists call_center_phone text not null default '0917-123-4567'
    check (char_length(btrim(call_center_phone)) between 1 and 40);

grant select on table public.dashboard_settings to anon, authenticated;
grant insert, update on table public.dashboard_settings to anon, authenticated;

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

grant insert on table public.announcements to anon, authenticated;

drop policy if exists "Anyone can post announcements" on public.announcements;
create policy "Anyone can post announcements"
  on public.announcements for insert
  to anon, authenticated
  with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dashboard_settings'
  ) then
    alter publication supabase_realtime add table public.dashboard_settings;
  end if;
end
$$;

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
  if (select auth.uid()) is not null
    and ((select auth.jwt()) -> 'app_metadata' ->> 'barangay_role') is distinct from 'official' then
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
