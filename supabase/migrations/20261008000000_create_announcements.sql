create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  author text not null check (char_length(btrim(author)) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
grant select, insert on public.announcements to anon, authenticated;

drop policy if exists "Anyone can read announcements" on public.announcements;
create policy "Anyone can read announcements"
  on public.announcements for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can post announcements" on public.announcements;
create policy "Anyone can post announcements"
  on public.announcements for insert
  to anon, authenticated
  with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end
$$;
