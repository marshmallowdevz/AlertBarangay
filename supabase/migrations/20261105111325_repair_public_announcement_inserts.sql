-- The dashboard is currently in open mode. Remove stale INSERT policies so
-- an older restrictive policy cannot reject posts, then restore the intended
-- shared-dashboard policy for both anonymous and signed-in clients.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'announcements'
      and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.announcements', v_policy.policyname);
  end loop;
end
$$;

grant insert on table public.announcements to anon, authenticated;

create policy "Anyone can post announcements"
  on public.announcements for insert
  to anon, authenticated
  with check (true);

-- The client requests the newly inserted row with .select(). Ensure anonymous
-- users can read shared announcements as intended by the open dashboard.
grant select on table public.announcements to anon, authenticated;

drop policy if exists "Anyone can read announcements" on public.announcements;
create policy "Anyone can read announcements"
  on public.announcements for select
  to anon, authenticated
  using (true);
