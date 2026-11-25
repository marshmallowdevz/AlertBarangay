create table if not exists public.system_settings (
  id smallint primary key check (id = 1),
  maintenance_mode boolean not null default false,
  maintenance_message text not null default 'AlertBarangay is currently undergoing scheduled maintenance. Please check back shortly.',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint system_settings_maintenance_message_length check (char_length(btrim(maintenance_message)) between 1 and 2000)
);

insert into public.system_settings (id) values (1) on conflict (id) do nothing;

alter table public.system_settings enable row level security;
revoke all on public.system_settings from public, anon, authenticated;
grant select (maintenance_mode, maintenance_message) on public.system_settings to anon, authenticated;
grant all on public.system_settings to service_role;

drop policy if exists "Anyone can read site maintenance state" on public.system_settings;
create policy "Anyone can read site maintenance state" on public.system_settings
  for select to anon, authenticated using (id = 1);

comment on table public.system_settings is 'Singleton site-wide controls; clients can read only maintenance state and its public message.';
