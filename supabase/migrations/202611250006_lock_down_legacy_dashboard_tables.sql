-- Closes anonymous access left behind by the older official-dashboard
-- migrations (Barangay-dashboard / Test branches) if they were applied to this
-- Supabase project. Those migrations let anyone holding the public key, even
-- without signing in, read and submit reports, post or edit announcements,
-- rewrite dashboard_settings (including emergency phone numbers), and call
-- dispatch_report().
--
-- Safe to re-run, and it skips any table or function that does not exist.
-- NOTE: the old official dashboard on those branches will need to sign in
-- before it can read or write these tables again.

set search_path = public, pg_catalog;

do $$
begin
  if to_regclass('public.reports') is not null then
    revoke all on public.reports from anon;
    drop policy if exists "Anyone can read reports" on public.reports;
    drop policy if exists "Anyone can submit reports" on public.reports;
    drop policy if exists "Staff can read reports" on public.reports;
    create policy "Staff can read reports" on public.reports
      for select to authenticated using (public.is_active_staff());
  end if;

  if to_regclass('public.report_history') is not null then
    revoke all on public.report_history from anon;
  end if;

  if to_regclass('public.notifications') is not null then
    revoke all on public.notifications from anon;
    drop policy if exists "Anyone can read notifications" on public.notifications;
  end if;

  if to_regclass('public.dashboard_settings') is not null then
    revoke insert, update, delete on public.dashboard_settings from anon, authenticated;
    drop policy if exists "Anyone can create dashboard settings" on public.dashboard_settings;
    drop policy if exists "Anyone can update dashboard settings" on public.dashboard_settings;
  end if;

  if to_regclass('public.announcements') is not null then
    -- Announcements are managed only through the admin server routes.
    revoke insert, update, delete on public.announcements from anon, authenticated;
    revoke select on public.announcements from anon;
    drop policy if exists "Anyone can post announcements" on public.announcements;
    drop policy if exists "Anyone can read announcements" on public.announcements;
    drop policy if exists "Open dashboard can update announcements" on public.announcements;
    drop policy if exists "Officials can update announcements" on public.announcements;
  end if;

  if to_regprocedure('public.dispatch_report(uuid, text, text)') is not null then
    -- The function skipped its role check when auth.uid() was null (anonymous).
    revoke execute on function public.dispatch_report(uuid, text, text) from public, anon;
  end if;
end;
$$;
