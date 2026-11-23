create table if not exists public.resident_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  sender_email text not null default '',
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

alter table public.resident_messages enable row level security;

create policy "Residents can send their own messages"
  on public.resident_messages for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Barangay admins can read resident messages"
  on public.resident_messages for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
