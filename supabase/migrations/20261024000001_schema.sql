-- SkillBridge database schema
-- Run this first (Supabase dashboard > SQL editor, or `supabase db push`)

-- =========================================================
-- Profiles (one row per user, created automatically on sign up)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  username text,
  email text,
  phone text,
  location text,
  place_id text,
  birth_year int check (birth_year between 1940 and 2020),
  headline text,
  about text,
  avatar_url text,
  job_types text[] not null default '{}',
  availability text[] not null default '{}',
  start_date text,
  max_travel_km int,
  drivers_licence text,
  linkedin_url text,
  portfolio_url text,
  visible_to_employers boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_username_unique on public.profiles (lower(username));

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  qualification text not null,
  title text not null,
  school text,
  field text,
  start_year text,
  end_year text,
  certificate_path text,
  certificate_name text,
  certificate_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  verified boolean not null default false,
  verified_score int,
  created_at timestamptz not null default now()
);
create unique index if not exists user_skills_unique on public.user_skills (user_id, lower(name));

create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  organisation text,
  kind text not null default 'Job',
  start_text text,
  end_text text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  level text not null default 'Good' check (level in ('Basic', 'Good', 'Fluent')),
  created_at timestamptz not null default now()
);
create unique index if not exists languages_unique on public.languages (user_id, lower(name));

-- =========================================================
-- Skills catalogue, tests and questions
-- =========================================================
create table if not exists public.skills_catalog (
  id serial primary key,
  name text not null,
  category text
);
create unique index if not exists skills_catalog_name on public.skills_catalog (lower(name));

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  skill text not null,
  name text not null,
  minutes int not null default 8,
  extra text,
  question_count int not null default 0,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists tests_skill_unique on public.tests (lower(skill));

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  position int not null,
  question text not null,
  options jsonb not null,
  answer_index int not null,
  unique (test_id, position)
);

-- Questions without the answers, safe for the app to read
create or replace view public.test_questions_public as
  select id, test_id, position, question, options from public.test_questions;

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  score int not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Jobs, mentors
-- =========================================================
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  area text not null,
  full_area text,
  pay text,
  job_type text not null default 'Full-time',
  level text not null default 'Entry level',
  distance_text text,
  travel_note text,
  filters text[] not null default '{}',
  needs text[] not null default '{}',
  gap_course text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_jobs (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  status text not null default 'Sent',
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  initials text not null,
  name text not null,
  role text not null,
  rating numeric(2, 1) not null default 5.0,
  about text,
  active boolean not null default true
);

create table if not exists public.mentor_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.mentors (id) on delete cascade,
  status text not null default 'Requested',
  created_at timestamptz not null default now(),
  unique (user_id, mentor_id)
);

-- =========================================================
-- Interview practice (written only by edge functions)
-- =========================================================
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_type text not null,
  question_type text not null,
  answer_seconds int not null default 120,
  questions jsonb not null default '[]',
  status text not null default 'in_progress' check (status in ('in_progress', 'grading', 'graded', 'failed')),
  overall_score int,
  summary text,
  created_at timestamptz not null default now(),
  graded_at timestamptz
);

create table if not exists public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  position int not null,
  question text not null,
  audio_path text,
  duration_seconds int,
  transcript text,
  score int,
  went_well text,
  improve text,
  better_answer text,
  unique (session_id, position)
);

-- =========================================================
-- Row level security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.education enable row level security;
alter table public.user_skills enable row level security;
alter table public.experience enable row level security;
alter table public.languages enable row level security;
alter table public.skills_catalog enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.jobs enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.applications enable row level security;
alter table public.mentors enable row level security;
alter table public.mentor_bookings enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_answers enable row level security;

-- Users read and update only their own profile
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Users manage only their own rows
do $$
declare t text;
begin
  foreach t in array array['education', 'user_skills', 'experience', 'languages', 'saved_jobs', 'applications', 'mentor_bookings'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
  foreach t in array array['test_attempts', 'interview_sessions', 'interview_answers'] loop
    execute format('drop policy if exists "own rows read" on public.%I', t);
    execute format('create policy "own rows read" on public.%I for select to authenticated using (user_id = auth.uid())', t);
  end loop;
  foreach t in array array['skills_catalog', 'tests', 'jobs', 'mentors'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Users can't mark their own skills as verified: only the test function does that
revoke insert, update on public.user_skills from anon, authenticated;
grant insert (name, level), update (name, level) on public.user_skills to authenticated;

-- Results and interview scores are written only by the server
revoke insert, update, delete on public.test_attempts, public.interview_sessions, public.interview_answers from anon, authenticated;
revoke all on public.test_questions from anon, authenticated;
grant select on public.test_questions_public to anon, authenticated;

-- =========================================================
-- Functions
-- =========================================================

-- Create a profile row when someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, username, email, phone, location, place_id)
  values (
    new.id,
    coalesce(meta ->> 'full_name', meta ->> 'name', ''),
    nullif(meta ->> 'username', ''),
    new.email,
    nullif(meta ->> 'phone', ''),
    nullif(meta ->> 'location', ''),
    nullif(meta ->> 'place_id', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Is a username free? (used on the sign up screen)
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;

-- Find the email for a username so people can log in with their username
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.profiles where lower(username) = lower(trim(p_username)) limit 1;
$$;

-- Mark a test, save the result and verify the skill
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
      v_missed := v_missed || jsonb_build_object('question', r.question, 'correct', r.options ->> r.answer_index);
    end if;
  end loop;

  v_score := round(100.0 * v_correct / greatest(v_total, 1));
  v_passed := v_score >= 70;

  if auth.uid() is not null then
    insert into public.test_attempts (user_id, test_id, score, passed)
    values (auth.uid(), p_test_id, v_score, v_passed);

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
    'passed', v_passed, 'saved', auth.uid() is not null, 'missed', v_missed
  );
end;
$$;

-- Interview sessions left this month (3 per month)
create or replace function public.interview_sessions_left()
returns int
language sql
security definer
set search_path = public
as $$
  select greatest(0, 3 - count(*)::int)
  from public.interview_sessions
  where user_id = auth.uid()
    and status in ('grading', 'graded')
    and created_at >= date_trunc('month', now());
$$;

revoke execute on function public.submit_test(uuid, int[]) from public;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.email_for_username(text) to anon, authenticated;
grant execute on function public.submit_test(uuid, int[]) to anon, authenticated;
grant execute on function public.interview_sessions_left() to authenticated;

-- =========================================================
-- File storage
-- =========================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('certificates', 'certificates', false), ('interview-audio', 'interview-audio', false)
on conflict (id) do nothing;

-- Each user can only touch files inside a folder named with their user id
drop policy if exists "own files read" on storage.objects;
create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'certificates', 'interview-audio') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files insert" on storage.objects;
create policy "own files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'certificates', 'interview-audio') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files update" on storage.objects;
create policy "own files update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'certificates', 'interview-audio') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'certificates', 'interview-audio') and (storage.foldername(name))[1] = auth.uid()::text);
