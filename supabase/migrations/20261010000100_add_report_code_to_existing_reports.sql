alter table public.reports
  add column if not exists report_code text;

update public.reports
set report_code = 'AB-' || upper(replace(gen_random_uuid()::text, '-', ''))
where report_code is null or btrim(report_code) = '';

alter table public.reports
  alter column report_code set default ('AB-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  alter column report_code set not null;

create unique index if not exists reports_report_code_key
  on public.reports (report_code);
