revoke delete on table public.announcements from anon;
grant delete on table public.announcements to authenticated;

drop policy if exists "Open dashboard can delete announcements" on public.announcements;
drop policy if exists "Anyone can delete announcements" on public.announcements;
drop policy if exists "Officials can delete announcements" on public.announcements;
create policy "Officials can delete announcements"
  on public.announcements for delete
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'barangay_role') = 'official');
