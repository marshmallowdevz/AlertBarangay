update public.dashboard_settings
set
  emergency_phone = '0918-921-0000',
  call_center_phone = '0915-583-9829',
  emergency_contacts = jsonb_build_array(
    jsonb_build_object('id', 'red-cross-cebu', 'name', 'Philippine Red Cross Cebu', 'phone', '0915-583-9829'),
    jsonb_build_object('id', 'labangon-fire', 'name', 'Fire Station (Labangon)', 'phone', '(032) 261-0911'),
    jsonb_build_object('id', 'labangon-police', 'name', 'Police Station (Labangon)', 'phone', '0998 598 6292'),
    jsonb_build_object('id', 'rescue-unit', 'name', 'Rescue Unit', 'phone', '0918-921-0000'),
    jsonb_build_object('id', 'city-hall', 'name', 'City Hall', 'phone', '(032) 411-0100'),
    jsonb_build_object('id', 'visayan-electric', 'name', 'Visayan Electric', 'phone', '(032) 230-8326'),
    jsonb_build_object('id', 'ccdrmo', 'name', 'CCDRRMO', 'phone', '(032) 262-1424'),
    jsonb_build_object('id', 'mcwd', 'name', 'MCWD', 'phone', '(032) 254-8434')
  )
where id = 'main';