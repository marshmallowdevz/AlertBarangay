alter table public.dashboard_settings
  add column if not exists emergency_contacts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(emergency_contacts) = 'array' and jsonb_array_length(emergency_contacts) <= 30);

update public.dashboard_settings
set emergency_contacts = jsonb_build_array(
  jsonb_build_object('id', 'emergency-line', 'name', 'Emergency line', 'phone', emergency_phone),
  jsonb_build_object('id', 'call-center', 'name', 'Call center support', 'phone', call_center_phone)
)
where id = 'main' and emergency_contacts = '[]'::jsonb;