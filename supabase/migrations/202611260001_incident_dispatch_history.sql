-- Store response assignments made from the official dispatch dashboard.
set search_path = public, pg_catalog;

create table if not exists public.incident_dispatches (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  response_type text not null check (response_type in (
    'Fire', 'Rescue', 'Department of Public Services', 'Visayan Electric', 'MCWD', 'DPWH', 'CCDRRMO'
  )),
  note text not null default '' check (char_length(note) <= 500),
  dispatched_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists incident_dispatches_created_idx
  on public.incident_dispatches(created_at desc);
create index if not exists incident_dispatches_incident_idx
  on public.incident_dispatches(incident_id, created_at desc);

alter table public.incident_dispatches enable row level security;
revoke all on public.incident_dispatches from anon, authenticated;
grant select on public.incident_dispatches to authenticated;
drop policy if exists "Active staff can read incident dispatches" on public.incident_dispatches;
create policy "Active staff can read incident dispatches"
  on public.incident_dispatches for select to authenticated
  using (public.is_active_staff());

-- Remove the earlier server-supplied actor signature if this migration was
-- trialed before the actor was bound to auth.uid().
drop function if exists public.dispatch_incident_response(uuid, uuid, text, text);

create or replace function public.dispatch_incident_response(
  p_incident_id uuid,
  p_response_type text,
  p_note text default ''
)
returns public.incident_dispatches
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  saved_dispatch public.incident_dispatches;
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = actor_id and role in ('admin', 'official') and is_active = true
  ) then
    raise exception 'Active staff access is required.' using errcode = '42501';
  end if;

  if p_response_type not in (
    'Fire', 'Rescue', 'Department of Public Services', 'Visayan Electric', 'MCWD', 'DPWH', 'CCDRRMO'
  ) then
    raise exception 'Unsupported response type.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Dispatch notes must be 500 characters or fewer.' using errcode = '22023';
  end if;

  update public.incidents set status = 'responding' where id = p_incident_id;
  if not found then
    raise exception 'Incident not found.' using errcode = 'P0002';
  end if;

  insert into public.incident_dispatches (incident_id, response_type, note, dispatched_by)
  values (p_incident_id, p_response_type, coalesce(p_note, ''), actor_id)
  returning * into saved_dispatch;

  return saved_dispatch;
end;
$$;

revoke all on function public.dispatch_incident_response(uuid, text, text) from public, anon;
grant execute on function public.dispatch_incident_response(uuid, text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'incident_dispatches'
     ) then
    alter publication supabase_realtime add table public.incident_dispatches;
  end if;
end;
$$;
