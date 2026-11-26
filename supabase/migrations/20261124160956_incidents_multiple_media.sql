-- Keep all emergency-report attachments on the incident row, while preserving
-- media_path/media_type as the first attachment for older clients.
alter table public.incidents
  add column if not exists media_paths text[] not null default '{}',
  add column if not exists media_types text[] not null default '{}';

update public.incidents
set media_paths = array[media_path],
    media_types = array[media_type]
where media_path is not null
  and cardinality(media_paths) = 0;

alter table public.incidents
  drop constraint if exists incidents_media_attachments_check;

alter table public.incidents
  add constraint incidents_media_attachments_check
  check (
    cardinality(media_paths) <= 5
    and cardinality(media_paths) = cardinality(media_types)
    and array_position(media_paths, null) is null
    and array_position(media_types, null) is null
    and media_types <@ array['image', 'video']::text[]
    and (
      (cardinality(media_paths) = 0
        and ((media_path is null and media_type is null)
          or (media_path is not null and media_type is not null)))
      or
      (cardinality(media_paths) > 0
        and media_path = media_paths[1]
        and media_type = media_types[1])
    )
  );

drop policy if exists "Residents can report incidents for themselves" on public.incidents;
create policy "Residents can report incidents for themselves"
  on public.incidents for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'pending'
    and (media_path is null or media_path like ((select auth.uid())::text || '/%'))
    and not exists (
      select 1
      from unnest(media_paths) as attachment(path)
      where attachment.path not like ((select auth.uid())::text || '/%')
    )
  );
