alter table public.reports
  add column if not exists author text;

update public.reports
set author = 'Unknown'
where author is null or btrim(author) = '';

alter table public.reports
  alter column author set default 'Unknown',
  alter column author set not null;

notify pgrst, 'reload schema';