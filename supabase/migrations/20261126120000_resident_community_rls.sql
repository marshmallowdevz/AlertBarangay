-- Community feed reads and writes are available only to active residents.
-- The application also checks the role on the server; these policies make
-- direct browser requests obey the same resident boundary.

alter table public.community_posts enable row level security;

drop policy if exists "Signed-in residents can view community posts" on public.community_posts;
drop policy if exists "Active residents can view community posts" on public.community_posts;
create policy "Active residents can view community posts"
  on public.community_posts for select to authenticated
  using (public.is_active_resident());

drop policy if exists "Residents can publish their own community posts" on public.community_posts;
drop policy if exists "Active residents can publish their own community posts" on public.community_posts;
create policy "Active residents can publish their own community posts"
  on public.community_posts for insert to authenticated
  with check (
    public.is_active_resident()
    and user_id = (select auth.uid())
    and (media_path is null or media_path like ((select auth.uid())::text || '/%'))
  );

drop policy if exists "Residents can delete their own community posts" on public.community_posts;
drop policy if exists "Active residents can delete their own community posts" on public.community_posts;
create policy "Active residents can delete their own community posts"
  on public.community_posts for delete to authenticated
  using (public.is_active_resident() and user_id = (select auth.uid()));

drop policy if exists "Residents can view community media" on storage.objects;
drop policy if exists "Active residents can view community media" on storage.objects;
create policy "Active residents can view community media"
  on storage.objects for select to authenticated
  using (bucket_id = 'community-media' and public.is_active_resident());

drop policy if exists "Residents can upload their own community media" on storage.objects;
drop policy if exists "Active residents can upload their own community media" on storage.objects;
create policy "Active residents can upload their own community media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and public.is_active_resident()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Residents can delete their own community media" on storage.objects;
drop policy if exists "Active residents can delete their own community media" on storage.objects;
create policy "Active residents can delete their own community media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-media'
    and public.is_active_resident()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
