-- Live jobs from Adzuna, Greenhouse and SmartRecruiters, AI match scores, and AI feedback on skills tests.

-- ---------- Jobs: room for live job posts ----------
alter table public.jobs add column if not exists source text not null default 'demo';
alter table public.jobs add column if not exists external_id text;
alter table public.jobs add column if not exists url text;
alter table public.jobs add column if not exists posted_at timestamptz;
alter table public.jobs add column if not exists last_seen_at timestamptz;
alter table public.jobs add column if not exists salary_min numeric;
alter table public.jobs add column if not exists salary_max numeric;
alter table public.jobs add column if not exists lat double precision;
alter table public.jobs add column if not exists lng double precision;
alter table public.jobs add column if not exists remote boolean not null default false;
create unique index if not exists jobs_source_external_unique on public.jobs (source, external_id);
create index if not exists jobs_active_posted_idx on public.jobs (active, posted_at desc);

-- ---------- Companies to follow on Greenhouse and SmartRecruiters ----------
-- token = the company's name in its careers URL:
--   job-boards.greenhouse.io/<token>   or   jobs.smartrecruiters.com/<token>
create table if not exists public.job_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('greenhouse', 'smartrecruiters')),
  token text not null,
  company_name text,
  active boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (provider, token)
);
alter table public.job_sources enable row level security; -- no policies: only the server reads it
revoke all on public.job_sources from anon, authenticated;

-- ---------- AI match score per user and job ----------
create table if not exists public.job_matches (
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  score int not null check (score between 0 and 100),
  chance text not null check (chance in ('High', 'Medium', 'Low')),
  summary text,
  reasons text[] not null default '{}',
  missing text[] not null default '{}',
  profile_hash text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
create index if not exists job_matches_user_score_idx on public.job_matches (user_id, score desc);
alter table public.job_matches enable row level security;
drop policy if exists "own rows read" on public.job_matches;
create policy "own rows read" on public.job_matches for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.job_matches from anon, authenticated;

-- When the user's live job search last ran (limits Adzuna calls)
alter table public.profiles add column if not exists jobs_refreshed_at timestamptz;

-- ---------- Skills tests: keep answers so the AI can explain mistakes ----------
alter table public.test_attempts add column if not exists answers int[];
alter table public.test_attempts add column if not exists feedback jsonb;

create or replace function public.submit_test(p_test_id uuid, p_answers int[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skill text;
  v_total int := 0;
  v_correct int := 0;
  v_score int;
  v_passed boolean;
  v_missed jsonb := '[]'::jsonb;
  v_attempt uuid;
  r record;
begin
  select skill into v_skill from public.tests where id = p_test_id;
  if v_skill is null then
    raise exception 'Test not found';
  end if;

  for r in
    select position, question, options, answer_index
    from public.test_questions where test_id = p_test_id order by position
  loop
    v_total := v_total + 1;
    if p_answers[v_total] is not distinct from r.answer_index then
      v_correct := v_correct + 1;
    else
      v_missed := v_missed || jsonb_build_object(
        'question', r.question,
        'correct', r.options ->> r.answer_index,
        'chosen', case when p_answers[v_total] between 0 and jsonb_array_length(r.options) - 1 then r.options ->> p_answers[v_total] else null end
      );
    end if;
  end loop;

  v_score := round(100.0 * v_correct / greatest(v_total, 1));
  v_passed := v_score >= 70;

  if auth.uid() is not null then
    insert into public.test_attempts (user_id, test_id, score, passed, answers)
    values (auth.uid(), p_test_id, v_score, v_passed, p_answers)
    returning id into v_attempt;

    if v_passed then
      insert into public.user_skills (user_id, name, level, verified, verified_score)
      values (auth.uid(), v_skill, 'Intermediate', true, v_score)
      on conflict (user_id, lower(name)) do update
        set verified = true,
            verified_score = greatest(coalesce(public.user_skills.verified_score, 0), excluded.verified_score);
    end if;
  end if;

  return jsonb_build_object(
    'score', v_score, 'correct', v_correct, 'total', v_total,
    'passed', v_passed, 'saved', auth.uid() is not null, 'missed', v_missed, 'attempt_id', v_attempt
  );
end;
$$;
grant execute on function public.submit_test(uuid, int[]) to anon, authenticated;
