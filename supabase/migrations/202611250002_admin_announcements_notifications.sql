create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists announcements_published_idx on public.announcements(published_at desc) where is_published;
drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at before update on public.announcements
for each row execute function public.set_updated_at();

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('account.created', 'announcement.published')),
  message text not null,
  subject_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists admin_notifications_created_idx on public.admin_notifications(created_at desc);
create table if not exists public.admin_notification_reads (
  notification_id uuid not null references public.admin_notifications(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, admin_id)
);
create index if not exists admin_notification_reads_admin_idx on public.admin_notification_reads(admin_id);

create or replace function public.notify_admin_of_new_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users where id = new.id and raw_user_meta_data ->> 'admin_managed' = 'true') then
    begin
      insert into public.admin_notifications (event_type, message, subject_id)
      values ('account.created', 'New account created: ' || coalesce(nullif(btrim(new.full_name), ''), 'New user'), new.id);
    exception when others then
      raise warning 'Unable to record account creation activity for profile %', new.id;
    end;
  end if;
  return new;
end;
$$;
drop trigger if exists profile_created_admin_notification on public.profiles;
create trigger profile_created_admin_notification after insert on public.profiles
for each row execute function public.notify_admin_of_new_profile();
revoke all on function public.notify_admin_of_new_profile() from public;

alter table public.announcements enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.admin_notification_reads enable row level security;
revoke all on public.announcements, public.admin_notifications from anon, authenticated;
revoke all on public.admin_notification_reads from anon, authenticated;
grant select on public.announcements to authenticated;
grant select on public.admin_notifications to authenticated;
grant all on public.announcements, public.admin_notifications, public.admin_notification_reads to service_role;

drop policy if exists "Authenticated users can read published announcements" on public.announcements;
create policy "Authenticated users can read published announcements" on public.announcements
  for select to authenticated using (is_published);
drop policy if exists "Active admins can read admin notifications" on public.admin_notifications;
create policy "Active admins can read admin notifications" on public.admin_notifications
  for select to authenticated using (public.is_active_admin());
drop policy if exists "Admins can read own notification receipts" on public.admin_notification_reads;
create policy "Admins can read own notification receipts" on public.admin_notification_reads
  for select to authenticated using (admin_id = (select auth.uid()) and public.is_active_admin());

do $$ begin
  alter publication supabase_realtime add table public.admin_notifications;
exception when duplicate_object then null;
end $$;

comment on table public.announcements is 'Shared barangay announcements. Connected dashboards can read published rows.';
comment on table public.admin_notifications is 'Admin activity feed for account creation and published announcements.';
