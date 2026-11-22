alter table public.announcements
  add column if not exists is_archived boolean not null default false;

grant update on table public.announcements to anon, authenticated;

drop policy if exists "Open dashboard can update announcements" on public.announcements;
create policy "Open dashboard can update announcements"
  on public.announcements for update
  to anon
  using (true)
  with check (true);

drop policy if exists "Officials can update announcements" on public.announcements;
create policy "Officials can update announcements"
  on public.announcements for update
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'barangay_role') = 'official')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'barangay_role') = 'official');
