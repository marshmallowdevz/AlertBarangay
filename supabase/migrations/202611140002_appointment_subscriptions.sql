create table if not exists public.appointment_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.appointment_subscriptions enable row level security;

create policy "Residents can subscribe with their own account details"
  on public.appointment_subscriptions for insert to authenticated
  with check (
    auth.uid() = user_id
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Residents and barangay admins can view appointment subscriptions"
  on public.appointment_subscriptions for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Residents can unsubscribe from appointment notifications"
  on public.appointment_subscriptions for delete to authenticated
  using (auth.uid() = user_id);
