-- When the user last ran a live job search (limits Adzuna and JSearch calls from the search box)
alter table public.profiles add column if not exists jobs_searched_at timestamptz;
