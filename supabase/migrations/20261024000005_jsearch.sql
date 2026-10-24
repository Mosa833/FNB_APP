-- JSearch (Google for Jobs) as a job source: where the post was published and whether the link goes straight to the employer.
alter table public.jobs add column if not exists publisher text;
alter table public.jobs add column if not exists apply_direct boolean;
-- Used to spot the same job posted on several sites
alter table public.jobs add column if not exists dedupe_key text;
create index if not exists jobs_dedupe_idx on public.jobs (dedupe_key);
