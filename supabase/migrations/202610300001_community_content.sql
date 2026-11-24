create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Resident',
  caption text not null default '',
  media_url text not null,
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;
create policy "Signed-in residents can view community posts"
  on public.community_posts for select to authenticated using (true);
create policy "Residents can publish their own community posts"
  on public.community_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "Residents can delete their own community posts"
  on public.community_posts for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.community_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.community_announcements enable row level security;
create policy "Signed-in residents can read community announcements"
  on public.community_announcements for select to authenticated using (true);
create policy "Barangay admins can publish announcements"
  on public.community_announcements for insert to authenticated
  with check (
    auth.uid() = author_id and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
