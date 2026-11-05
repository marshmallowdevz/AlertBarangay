create table if not exists public.dashboard_settings (
  id text primary key default 'main' check (id = 'main'),
  name text not null default 'Captain Dela Cruz'
    check (char_length(btrim(name)) between 1 and 80),
  picture text not null default ''
    check (char_length(picture) <= 1500000),
  emergency_phone text not null default '911'
    check (char_length(btrim(emergency_phone)) between 1 and 40),
  call_center_phone text not null default '0917-123-4567'
    check (char_length(btrim(call_center_phone)) between 1 and 40),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_settings enable row level security;

grant select, insert, update on table public.dashboard_settings to anon, authenticated;

drop policy if exists "Anyone can read dashboard settings" on public.dashboard_settings;
create policy "Anyone can read dashboard settings"
  on public.dashboard_settings for select
  to anon, authenticated
  using (true);

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
