-- Changes from the mentor feedback:
-- 1. Skills tests draw random questions from a larger pool, with a wait before retaking a failed test
-- 2. Three badge levels per skill: Knowledge (test), Practical (task checked against a brief), Endorsed (a real person confirms)
-- 3. Users can report a job; dead job links are checked
-- 4. A bias report for job match scores
-- 5. "My path" tracking (CV built)

-- ---------- 1. Skills tests: random questions per attempt, wait before retake ----------
alter table public.test_attempts alter column score drop not null;
alter table public.test_attempts alter column passed drop not null;
alter table public.test_attempts add column if not exists status text not null default 'done' check (status in ('started', 'done'));
alter table public.test_attempts add column if not exists question_ids uuid[];

-- How long to wait after a failed attempt before trying the same test again
create or replace function public.test_retry_hours() returns int language sql immutable as $$ select 12 $$;

-- Starts a test: picks up to 8 random questions from the pool. Answers are never sent to the app.
create or replace function public.start_test(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test record;
  v_last record;
  v_ids uuid[];
  v_attempt uuid;
  v_questions jsonb;
begin
  select * into v_test from public.tests where id = p_test_id;
  if v_test.id is null then raise exception 'Test not found'; end if;

  if auth.uid() is not null then
    select passed, created_at into v_last from public.test_attempts
      where user_id = auth.uid() and test_id = p_test_id and status = 'done'
      order by created_at desc limit 1;
    if v_last.passed is false and v_last.created_at > now() - make_interval(hours => public.test_retry_hours()) then
      raise exception 'RETRY_LATER:%', to_char((v_last.created_at + make_interval(hours => public.test_retry_hours())) at time zone 'Africa/Johannesburg', 'DD Mon HH24:MI');
    end if;
  end if;

  select array_agg(id) into v_ids from (
    select id from public.test_questions where test_id = p_test_id order by random() limit 8
  ) q;
  if v_ids is null then raise exception 'This test has no questions yet'; end if;

  select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', q.options) order by array_position(v_ids, q.id))
    into v_questions from public.test_questions q where q.id = any(v_ids);

  if auth.uid() is not null then
    insert into public.test_attempts (user_id, test_id, status, question_ids)
    values (auth.uid(), p_test_id, 'started', v_ids) returning id into v_attempt;
  end if;

  return jsonb_build_object('attempt_id', v_attempt, 'questions', v_questions, 'minutes', v_test.minutes);
end;
$$;
grant execute on function public.start_test(uuid) to anon, authenticated;

-- Marks an attempt started with start_test. Guests (no attempt) are marked but nothing is saved.
create or replace function public.submit_attempt(p_attempt_id uuid, p_question_ids uuid[], p_answers int[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_test_id uuid;
  v_skill text;
  v_ids uuid[] := p_question_ids;
  v_total int := 0;
  v_correct int := 0;
  v_score int;
  v_passed boolean;
  v_missed jsonb := '[]'::jsonb;
  v_answer int;
  r record;
begin
  if p_attempt_id is not null then
    select * into v_attempt from public.test_attempts where id = p_attempt_id;
    if v_attempt.id is null or v_attempt.user_id is distinct from auth.uid() then raise exception 'Test attempt not found'; end if;
    if v_attempt.status = 'done' then raise exception 'This test was already marked'; end if;
    v_ids := v_attempt.question_ids; -- only the questions this attempt was given count
  end if;
  if v_ids is null or array_length(v_ids, 1) is null then raise exception 'No questions were sent'; end if;

  for i in 1 .. array_length(v_ids, 1) loop
    select q.question, q.options, q.answer_index, q.test_id into r from public.test_questions q where q.id = v_ids[i];
    if r.question is null then continue; end if;
    v_test_id := r.test_id;
    v_total := v_total + 1;
    v_answer := p_answers[i];
    if v_answer is not distinct from r.answer_index then
      v_correct := v_correct + 1;
    else
      v_missed := v_missed || jsonb_build_object(
        'question', r.question,
        'correct', r.options ->> r.answer_index,
        'chosen', case when v_answer between 0 and jsonb_array_length(r.options) - 1 then r.options ->> v_answer else null end);
    end if;
  end loop;

  v_score := round(100.0 * v_correct / greatest(v_total, 1));
  v_passed := v_score >= 70;
  select skill into v_skill from public.tests where id = v_test_id;

  if p_attempt_id is not null then
    update public.test_attempts set status = 'done', score = v_score, passed = v_passed, answers = p_answers where id = p_attempt_id;
    if v_passed then
      insert into public.user_skills (user_id, name, level, verified, verified_score)
      values (auth.uid(), v_skill, 'Intermediate', true, v_score)
      on conflict (user_id, lower(name)) do update
        set verified = true,
            verified_score = greatest(coalesce(public.user_skills.verified_score, 0), excluded.verified_score);
    end if;
  end if;

  return jsonb_build_object('score', v_score, 'correct', v_correct, 'total', v_total, 'passed', v_passed,
    'saved', p_attempt_id is not null, 'missed', v_missed, 'attempt_id', p_attempt_id,
    'retry_hours', case when v_passed then null else public.test_retry_hours() end);
end;
$$;
grant execute on function public.submit_attempt(uuid, uuid[], int[]) to anon, authenticated;

-- ---------- 2. Badge levels ----------
alter table public.user_skills add column if not exists practical boolean not null default false;
alter table public.user_skills add column if not exists endorsed boolean not null default false;
-- Users still can't set these themselves: only name and level are writable (see the schema migration)

-- One practical task brief per skill, written once and shared
create table if not exists public.practical_tasks (
  id uuid primary key default gen_random_uuid(),
  skill text not null,
  brief text not null,
  checklist jsonb not null default '[]',
  evidence_hint text,
  created_at timestamptz not null default now()
);
create unique index if not exists practical_tasks_skill_unique on public.practical_tasks (lower(skill));
alter table public.practical_tasks enable row level security;
drop policy if exists "anyone reads" on public.practical_tasks;
create policy "anyone reads" on public.practical_tasks for select to anon, authenticated using (true);
revoke insert, update, delete on public.practical_tasks from anon, authenticated;

-- Evidence the user sent for a practical task, and what the check found
create table if not exists public.skill_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.user_skills (id) on delete cascade,
  file_path text,
  description text,
  passed boolean not null,
  feedback text,
  created_at timestamptz not null default now()
);
alter table public.skill_evidence enable row level security;
drop policy if exists "own rows read" on public.skill_evidence;
create policy "own rows read" on public.skill_evidence for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.skill_evidence from anon, authenticated;

-- Endorsements: someone who has seen the work confirms it through a private link
create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.user_skills (id) on delete cascade,
  endorser_name text not null check (char_length(endorser_name) between 2 and 80),
  relationship text not null check (char_length(relationship) between 2 and 80),
  -- Required so employers can contact the endorser and check: a user could otherwise confirm their own link
  contact text not null check (char_length(contact) between 5 and 120),
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
alter table public.endorsements enable row level security;
drop policy if exists "own rows read" on public.endorsements;
create policy "own rows read" on public.endorsements for select to authenticated using (user_id = auth.uid());
drop policy if exists "own rows insert" on public.endorsements;
create policy "own rows insert" on public.endorsements for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.user_skills s where s.id = skill_id and s.user_id = auth.uid()));
drop policy if exists "own rows delete" on public.endorsements;
create policy "own rows delete" on public.endorsements for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.endorsements from anon, authenticated;
grant insert (skill_id, endorser_name, relationship, contact) on public.endorsements to authenticated;

-- Private folder for practical task evidence (kept so the user can show it later)
insert into storage.buckets (id, name, public) values ('skill-evidence', 'skill-evidence', false) on conflict (id) do nothing;
drop policy if exists "own evidence read" on storage.objects;
create policy "own evidence read" on storage.objects for select to authenticated
  using (bucket_id = 'skill-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own evidence insert" on storage.objects;
create policy "own evidence insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'skill-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own evidence delete" on storage.objects;
create policy "own evidence delete" on storage.objects for delete to authenticated
  using (bucket_id = 'skill-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 3. Job reports and link checks ----------
create table if not exists public.job_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  reason text not null check (reason in ('closed', 'broken_link', 'scam', 'wrong_details')),
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index if not exists job_reports_job_idx on public.job_reports (job_id);
alter table public.job_reports enable row level security;
drop policy if exists "own rows read" on public.job_reports;
create policy "own rows read" on public.job_reports for select to authenticated using (user_id = auth.uid());
drop policy if exists "own rows insert" on public.job_reports;
create policy "own rows insert" on public.job_reports for insert to authenticated with check (user_id = auth.uid());
revoke update, delete on public.job_reports from anon, authenticated;

alter table public.jobs add column if not exists link_checked_at timestamptz;

-- ---------- 4. Bias report for match scores ----------
create table if not exists public.bias_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  passed boolean not null,
  summary text not null,
  details jsonb not null default '{}'
);
alter table public.bias_reports enable row level security;
drop policy if exists "anyone reads" on public.bias_reports;
create policy "anyone reads" on public.bias_reports for select to anon, authenticated using (true);
revoke insert, update, delete on public.bias_reports from anon, authenticated;

-- ---------- 5. My path ----------
alter table public.profiles add column if not exists cv_built_at timestamptz;
