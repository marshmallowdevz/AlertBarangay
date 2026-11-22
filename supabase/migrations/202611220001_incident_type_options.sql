-- Add the incident categories used by the shared dashboard and map report form.
-- Keep crime and other accepted so existing rows remain valid; the client no
-- longer offers either value for new reports.
alter table public.incidents
  drop constraint if exists incidents_type_check;

alter table public.incidents
  add constraint incidents_type_check
  check (type in (
    'fire',
    'medical',
    'flood',
    'crime',
    'accident',
    'other',
    'electrical_hazard',
    'garbage_collection',
    'road_damage',
    'water_problems'
  ));
