create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net;
set search_path = public, extensions, pg_catalog;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  eid text not null unique,
  type text not null check (type in ('fire', 'medical', 'flood', 'crime', 'accident', 'other')),
  description text not null check (char_length(description) <= 300),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  geog geography(Point, 4326)
    generated always as (
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) stored,
  status text not null default 'pending' check (status in ('pending', 'responding', 'resolved')),
  media_path text,
  media_type text check (media_type is null or media_type in ('image', 'video')),
  reporter_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((media_path is null) = (media_type is null))
);

create index if not exists incidents_geog_gist_idx on public.incidents using gist (geog);
create index if not exists incidents_created_at_idx on public.incidents (created_at desc);
create index if not exists incidents_status_idx on public.incidents (status);
-- The unique constraint on eid creates the required unique index.

create or replace function public.generate_incident_eid()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  candidate text;
  suffix text;
  i integer;
begin
  loop
    suffix := '';
    for i in 1..6 loop
      suffix := suffix || substr(alphabet, (get_byte(gen_random_bytes(1), 0) % 36) + 1, 1);
    end loop;
    candidate := 'EID-' || to_char(timezone('UTC', now()), 'YYYYMMDD') || '-' || suffix;

    -- Serialize equal candidates, then check before returning. The UNIQUE
    -- constraint remains the final guard against duplicate stored EIDs.
    perform pg_advisory_xact_lock(hashtextextended(candidate, 0));
    if not exists (select 1 from public.incidents where eid = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

alter table public.incidents alter column eid set default public.generate_incident_eid();
revoke all on function public.generate_incident_eid() from public;
grant execute on function public.generate_incident_eid() to authenticated;

create or replace function public.assign_incident_eid()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  new.eid := public.generate_incident_eid();
  new.created_at := now();
  new.updated_at := new.created_at;
  new.status := 'pending';
  return new;
end;
$$;

create or replace function public.update_incident_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists incidents_assign_eid on public.incidents;
create trigger incidents_assign_eid
  before insert on public.incidents
  for each row execute function public.assign_incident_eid();

drop trigger if exists incidents_updated_at on public.incidents;
create trigger incidents_updated_at
  before update on public.incidents
  for each row execute function public.update_incident_updated_at();

alter table public.incidents enable row level security;
drop policy if exists "Authenticated users can view incidents" on public.incidents;
create policy "Authenticated users can view incidents"
  on public.incidents for select to authenticated using (true);

drop policy if exists "Residents can report incidents for themselves" on public.incidents;
create policy "Residents can report incidents for themselves"
  on public.incidents for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'pending'
    and (media_path is null or media_path like (auth.uid()::text || '/%'))
  );

drop policy if exists "Officials can update incident status" on public.incidents;
create policy "Officials can update incident status"
  on public.incidents for update to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

revoke all on public.incidents from anon, authenticated;
grant select, insert on public.incidents to authenticated;
grant update (status) on public.incidents to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'incidents'
     ) then
    alter publication supabase_realtime add table public.incidents;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-media',
  'incident-media',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Incident media is readable by authenticated users" on storage.objects;
create policy "Incident media is readable by authenticated users"
  on storage.objects for select to authenticated
  using (bucket_id = 'incident-media');

drop policy if exists "Residents upload size-limited incident media to their folder" on storage.objects;
create policy "Residents upload size-limited incident media to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'incident-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      (coalesce(metadata ->> 'mimetype', '') like 'image/%'
        and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880)
      or
      (coalesce(metadata ->> 'mimetype', '') like 'video/%'
        and coalesce((metadata ->> 'size')::bigint, 0) <= 15728640)
    )
  );

drop policy if exists "Residents can clean up their own incident uploads" on storage.objects;
create policy "Residents can clean up their own incident uploads"
  on storage.objects for delete to authenticated
  using (bucket_id = 'incident-media' and (storage.foldername(name))[1] = auth.uid()::text);

comment on table public.incidents is
  'Emergency reports for the live map. Resolved incidents remain after old media is removed by the scheduled cleanup Edge Function.';

-- Run the server-side cleanup daily. It removes only media for resolved rows
-- older than 30 days; it preserves each incident row and its EID.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-resolved-incident-media') then
    perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'cleanup-resolved-incident-media';
  end if;

  perform cron.schedule(
    'cleanup-resolved-incident-media',
    '0 19 * * *', -- 03:00 Asia/Singapore
    $job$
      select net.http_post(
        url := 'https://lemnfqjyrhirjnfukfrm.supabase.co/functions/v1/cleanup-resolved-incident-media',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'incident_cleanup_publishable_key'
            limit 1
          ),
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'incident_cleanup_secret'
            limit 1
          )
        ),
        body := '{}'::jsonb
      )
      where exists (
        select 1 from vault.decrypted_secrets
        where name = 'incident_cleanup_secret'
      ) and exists (
        select 1 from vault.decrypted_secrets
        where name = 'incident_cleanup_publishable_key'
      );
    $job$
  );
end;
$$;
