create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_code text not null unique default ('AB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  type text not null check (type in ('Medical', 'Fire', 'Rescue', 'Flooding', 'Power', 'Other')),
  severity text not null check (severity in ('Low', 'Medium', 'High')),
  status text not null default 'Pending' check (status in ('Pending', 'Assigned', 'In progress', 'Monitoring', 'Resolved', 'Closed')),
  location text not null check (char_length(btrim(location)) between 1 and 160),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  author text not null check (char_length(btrim(author)) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
grant select, insert on public.reports to anon, authenticated;

drop policy if exists "Anyone can read reports" on public.reports;
create policy "Anyone can read reports"
  on public.reports for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can submit reports" on public.reports;
create policy "Anyone can submit reports"
  on public.reports for insert
  to anon, authenticated
  with check (true);
