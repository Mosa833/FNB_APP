-- All migrations in one file. Paste this into the Supabase SQL Editor and click Run.
-- Only use this if you are NOT using setup.ps1 (the script already runs these).

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
-- SkillBridge starter data (demo jobs and mentors, real test questions)

insert into public.skills_catalog (name, category) values
  ('Digital literacy', 'Digital and IT'),
  ('Microsoft Word', 'Digital and IT'),
  ('Excel', 'Digital and IT'),
  ('PowerPoint', 'Digital and IT'),
  ('Google Workspace', 'Digital and IT'),
  ('Email writing', 'Digital and IT'),
  ('Typing', 'Digital and IT'),
  ('Data capturing', 'Digital and IT'),
  ('Data entry', 'Digital and IT'),
  ('Social media', 'Digital and IT'),
  ('Social media marketing', 'Digital and IT'),
  ('Canva', 'Digital and IT'),
  ('Graphic design', 'Digital and IT'),
  ('Photography', 'Digital and IT'),
  ('Video editing', 'Digital and IT'),
  ('Content writing', 'Digital and IT'),
  ('Copywriting', 'Digital and IT'),
  ('Web design', 'Digital and IT'),
  ('HTML and CSS', 'Digital and IT'),
  ('JavaScript', 'Digital and IT'),
  ('Python', 'Digital and IT'),
  ('SQL', 'Digital and IT'),
  ('App development', 'Digital and IT'),
  ('IT support', 'Digital and IT'),
  ('Computer repairs', 'Digital and IT'),
  ('Networking', 'Digital and IT'),
  ('Cybersecurity basics', 'Digital and IT'),
  ('Phone repair', 'Digital and IT'),
  ('Online research', 'Digital and IT'),
  ('Customer service', 'Office and business'),
  ('Phone etiquette', 'Office and business'),
  ('Reception', 'Office and business'),
  ('Filing and admin', 'Office and business'),
  ('Bookkeeping', 'Office and business'),
  ('Basic accounting', 'Office and business'),
  ('Payroll', 'Office and business'),
  ('Report writing', 'Office and business'),
  ('Stock control', 'Office and business'),
  ('Inventory management', 'Office and business'),
  ('Sales', 'Office and business'),
  ('Telesales', 'Office and business'),
  ('Marketing', 'Office and business'),
  ('Event planning', 'Office and business'),
  ('Project coordination', 'Office and business'),
  ('Scheduling', 'Office and business'),
  ('Minute taking', 'Office and business'),
  ('Cash handling', 'Office and business'),
  ('Cashier', 'Office and business'),
  ('Point of sale (POS)', 'Office and business'),
  ('Merchandising', 'Office and business'),
  ('Retail sales', 'Office and business'),
  ('Call centre', 'Office and business'),
  ('Debt collection', 'Office and business'),
  ('Electrical work', 'Trades and technical'),
  ('Plumbing', 'Trades and technical'),
  ('Welding', 'Trades and technical'),
  ('Carpentry', 'Trades and technical'),
  ('Painting', 'Trades and technical'),
  ('Bricklaying', 'Trades and technical'),
  ('Tiling', 'Trades and technical'),
  ('Motor mechanics', 'Trades and technical'),
  ('Panel beating', 'Trades and technical'),
  ('Solar panel installation', 'Trades and technical'),
  ('Air conditioning repair', 'Trades and technical'),
  ('Appliance repair', 'Trades and technical'),
  ('Sewing', 'Trades and technical'),
  ('Tailoring', 'Trades and technical'),
  ('Hairdressing', 'Trades and technical'),
  ('Barbering', 'Trades and technical'),
  ('Nail technician', 'Trades and technical'),
  ('Makeup artistry', 'Trades and technical'),
  ('Beauty therapy', 'Trades and technical'),
  ('Cooking', 'Food and hospitality'),
  ('Baking', 'Food and hospitality'),
  ('Food preparation', 'Food and hospitality'),
  ('Barista', 'Food and hospitality'),
  ('Waitering', 'Food and hospitality'),
  ('Bartending', 'Food and hospitality'),
  ('Housekeeping', 'Food and hospitality'),
  ('Cleaning', 'Food and hospitality'),
  ('Food safety and hygiene', 'Food and hospitality'),
  ('Tutoring', 'Care and education'),
  ('Teaching assistant', 'Care and education'),
  ('Childcare', 'Care and education'),
  ('Early childhood development', 'Care and education'),
  ('Elderly care', 'Care and education'),
  ('First aid', 'Care and education'),
  ('Home-based care', 'Care and education'),
  ('Community health work', 'Care and education'),
  ('Driving', 'Transport and outdoor'),
  ('Delivery driving', 'Transport and outdoor'),
  ('Forklift operation', 'Transport and outdoor'),
  ('Warehouse work', 'Transport and outdoor'),
  ('Picking and packing', 'Transport and outdoor'),
  ('Logistics coordination', 'Transport and outdoor'),
  ('Security guarding', 'Transport and outdoor'),
  ('Gardening', 'Transport and outdoor'),
  ('Landscaping', 'Transport and outdoor'),
  ('Farming', 'Transport and outdoor'),
  ('Construction labour', 'Transport and outdoor'),
  ('Health and safety', 'Transport and outdoor'),
  ('Communication', 'Work skills'),
  ('Teamwork', 'Work skills'),
  ('Problem solving', 'Work skills'),
  ('Time management', 'Work skills'),
  ('Leadership', 'Work skills'),
  ('Public speaking', 'Work skills'),
  ('Negotiation', 'Work skills'),
  ('Conflict resolution', 'Work skills'),
  ('Attention to detail', 'Work skills'),
  ('Critical thinking', 'Work skills'),
  ('Creativity', 'Work skills'),
  ('Adaptability', 'Work skills')
on conflict do nothing;

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Digital literacy', 'Digital literacy', 8, null, 10)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'You receive an email asking for your bank PIN to "verify your account". What should you do?', '["Reply with the PIN so the account stays open", "Delete it and report it as phishing", "Forward it to a friend to check", "Click the link and log in"]', 1),
  (2, 'Which password is the strongest?', '["thabo2003", "123456789", "Taxi!Rank7Soweto", "password"]', 2),
  (3, 'What does "Ctrl + C" do on most computers?', '["Closes the window", "Copies the selected item", "Cuts the selected item", "Changes the font"]', 1),
  (4, 'A website address starts with "https". What does the "s" tell you?', '["The site is a shop", "The site is slow", "The connection is secure", "The site is from South Africa"]', 2),
  (5, 'In a spreadsheet, what does =SUM(A1:A5) do?', '["Adds the numbers in A1 to A5", "Counts the cells in A1 to A5", "Finds the biggest number", "Sorts the numbers"]', 0),
  (6, 'You want to send a big file to an employer. What is the best option?', '["Print it and take a photo", "Share a link from cloud storage", "Send it in 10 WhatsApp messages", "Copy it to a CD"]', 1),
  (7, 'What is the safest way to use public Wi-Fi?', '["Do online banking freely", "Avoid logging into sensitive accounts", "Turn off your screen lock", "Share your hotspot password"]', 1),
  (8, 'Which email address looks the most professional for job applications?', '["coolboi99@email.com", "thabo.mokoena@email.com", "partyking@email.com", "xx_thabo_xx@email.com"]', 1),
  (9, 'A pop-up says your phone has a virus and asks you to call a number. What should you do?', '["Call the number right away", "Pay to remove the virus", "Close it and do not call", "Give them your ID number"]', 2),
  (10, 'What does "BCC" mean when sending an email?', '["Others cannot see who else got the email", "The email is sent faster", "The email is deleted after reading", "The email is sent to your boss"]', 0)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Customer service', 'Customer service', 6, null, 6)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'A customer is angry about a late delivery. What do you do first?', '["Argue that it is not your fault", "Listen and say you understand", "Put them on hold for a long time", "Tell them to call later"]', 1),
  (2, 'You don''t know the answer to a customer''s question. What is best?', '["Guess an answer", "Say you will find out and come back to them", "Ignore the question", "Tell them to Google it"]', 1),
  (3, 'What is a good way to end a call with a customer?', '["Hang up once they stop talking", "Ask if there is anything else you can help with", "Say \"bye\" quickly", "Transfer them to anyone"]', 1),
  (4, 'A customer uses rude words. What should you do?', '["Be rude back", "Stay calm and polite, and ask a manager if needed", "Laugh at them", "Leave without saying anything"]', 1),
  (5, 'Why should you use the customer''s name during a conversation?', '["It makes it personal and respectful", "It is a rule nobody follows", "It makes the call longer", "It is not allowed"]', 0),
  (6, 'A customer wants something your shop doesn''t sell. What is the best reply?', '["\"We don''t have it.\" and walk away", "Suggest a similar item or where they could find it", "Tell them it is a bad product", "Pretend you did not hear"]', 1)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Excel', 'Excel basics', 6, null, 6)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'Which formula finds the average of cells B2 to B10?', '["=AVG(B2-B10)", "=AVERAGE(B2:B10)", "=MEAN(B2:B10)", "=SUM(B2/B10)"]', 1),
  (2, 'What is a cell in Excel?', '["A full row", "Where a row and column meet", "A saved file", "A chart"]', 1),
  (3, 'How do you keep the top row visible while scrolling?', '["Freeze panes", "Merge cells", "Wrap text", "Hide row"]', 0),
  (4, 'What does =COUNTIF(A:A,"Yes") do?', '["Adds all \"Yes\" values", "Counts the cells that say \"Yes\"", "Deletes \"Yes\" cells", "Sorts by \"Yes\""]', 1),
  (5, 'Which tool lets you show only rows that match a value?', '["Filter", "Format painter", "Spell check", "Page layout"]', 0),
  (6, 'What does a $ do in =$A$1?', '["Shows money format", "Keeps the cell reference fixed when copied", "Makes the cell bold", "Adds the numbers"]', 1)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Phone repair', 'Phone repair', 12, 'Practical questions', 8)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'Before opening a phone, what should you do first?', '["Charge it fully", "Switch it off and remove the SIM tray", "Pour water on it", "Factory reset it"]', 1),
  (2, 'A phone screen is black but the phone vibrates. What is the most likely problem?', '["Broken display or display cable", "No airtime", "Wrong SIM card", "Full storage"]', 0),
  (3, 'Which tool is safest for lifting a glued back cover?', '["A kitchen knife", "Heat and a plastic opening pick", "A hammer", "A metal screwdriver forced in"]', 1),
  (4, 'Why should you disconnect the battery before replacing parts?', '["To avoid short circuits and damage", "To make the phone lighter", "It is not needed", "To reset the time"]', 0),
  (5, 'A battery is swollen. What should you do?', '["Press it flat", "Keep using it", "Replace it and dispose of it safely", "Put it in the fridge"]', 2),
  (6, 'A phone won''t charge. What is a quick first check?', '["Clean the charging port and try another cable", "Replace the screen", "Update the apps", "Change the wallpaper"]', 0),
  (7, 'What does ESD protection prevent?', '["Water damage", "Static electricity damaging parts", "Screen scratches", "Viruses"]', 1),
  (8, 'Before handing a phone back, what should you do?', '["Test calls, charging, screen and buttons with the customer", "Hand it back without testing", "Keep their SIM card", "Delete their photos"]', 0)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Cashier', 'Cashier', 6, null, 6)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'A customer pays R200 for items costing R147,50. How much change do you give?', '["R52,50", "R53,50", "R47,50", "R62,50"]', 0),
  (2, 'Your till is R50 short at the end of your shift. What should you do?', '["Take money from your own pocket quietly", "Report it to your supervisor honestly", "Ignore it", "Blame the customer"]', 1),
  (3, 'A customer hands you a R200 note that feels and looks strange. What do you do?', '["Accept it to keep the line moving", "Check the security features and call a supervisor if unsure", "Tear it up", "Give it back and shout"]', 1),
  (4, 'The card machine is offline. What is the best response?', '["Tell the customer to leave", "Apologise, offer cash or another till, and call a supervisor", "Write down their card number", "Wait without saying anything"]', 1),
  (5, 'Why should you count change back to the customer?', '["It wastes time", "It helps avoid mistakes and builds trust", "It is only for big amounts", "Customers do not like it"]', 1),
  (6, 'A customer wants to return an item without a slip. What should you do?', '["Refuse rudely", "Follow the shop returns policy and ask a supervisor", "Give cash straight away", "Keep the item for yourself"]', 1)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Data capturing', 'Data capturing', 6, null, 6)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'What is the most important thing when capturing data?', '["Speed only", "Accuracy", "Making it colourful", "Using capital letters"]', 1),
  (2, 'You see an ID number with 12 digits on a form. South African ID numbers have 13. What do you do?', '["Add a random digit", "Flag it and check with the source", "Leave the field empty without telling anyone", "Delete the whole form"]', 1),
  (3, 'Which date format avoids confusion between days and months?', '["03/04/24", "2024-04-03", "3 4 24", "April-ish 2024"]', 1),
  (4, 'Why should you save your work often?', '["To make the file bigger", "So you do not lose data if something crashes", "It is not needed", "To change the font"]', 1),
  (5, 'You are capturing private client details. What should you do?', '["Share them on WhatsApp for help", "Keep them confidential and lock your screen when you leave", "Print extra copies to take home", "Post them on social media"]', 1),
  (6, 'Two records look the same in a list. What is this called?', '["A duplicate", "A formula", "A backup", "A filter"]', 0)
) as v (position, question, options, answer_index);

insert into public.jobs (title, company, area, full_area, pay, job_type, level, distance_text, travel_note, filters, needs, gap_course, description) values
  ('Junior Admin Assistant', 'Lerato Logistics', 'Braamfontein', 'Braamfontein, Johannesburg', 'R6 500/month', 'Full-time', 'Entry level', '6 km', 'Taxi about R30/day', array['Near me']::text[], array['Excel','Customer service','Matric','Report writing']::text[], 'Report writing', 'Answer phones, file documents, capture orders in Excel and help the office manager with daily reports.'),
  ('Call Centre Agent', 'Ubuntu Connect', 'Soweto', 'Soweto, Johannesburg', 'R5 800/month', 'Full-time', 'Entry level', '3 km', 'Walkable', array['Near me']::text[], array['Customer service','Digital literacy','Matric','Phone etiquette']::text[], 'Phone etiquette', 'Take inbound calls from customers, log queries on the computer and solve simple account problems.'),
  ('Social Media Helper', 'Kasi Bakes', 'Remote', 'Remote', 'R800 for a 1 week task', 'Microinternship', 'Entry level', 'Remote', 'No travel', array['Part-time','Internships']::text[], array['Social media','Canva','Digital literacy']::text[], 'Canva', 'Create 5 posts for a small bakery, schedule them and reply to comments for one week.'),
  ('Phone Repair Assistant', 'FixIt Mobile', 'Maponya Mall, Soweto', 'Maponya Mall, Soweto', 'R4 200/month', 'Part-time', 'Entry level', '4 km', 'Taxi about R20/day', array['Near me','Part-time']::text[], array['Phone repair','Customer service','Cashier']::text[], 'Cashier', 'Help the technician with screen and battery repairs, test phones and take payments.'),
  ('Cashier', 'Kasi Fresh Market', 'Protea Glen', 'Protea Glen, Soweto', 'R4 800/month', 'Full-time', 'Entry level', '8 km', 'Taxi about R26/day', array['Near me']::text[], array['Cashier','Cash handling','Customer service','Matric']::text[], 'Cash handling', 'Serve customers at the till, handle cash and card payments and keep your till area tidy.'),
  ('Data Capturer', 'Mzansi Health Records', 'Johannesburg CBD', 'Marshalltown, Johannesburg', 'R5 500/month', 'Contract', 'Entry level', '14 km', 'Taxi about R36/day', array[]::text[], array['Data capturing','Typing','Excel','Matric']::text[], 'Typing', 'Capture patient forms into the records system accurately and check for missing details.'),
  ('Delivery Driver', 'QuickDrop Couriers', 'Midrand', 'Midrand, Gauteng', 'R7 000/month', 'Full-time', 'Entry level', '35 km', 'Company vehicle provided', array[]::text[], array['Driving','Customer service','Matric']::text[], 'Customer service', 'Deliver parcels around Gauteng. You need a valid Code 8 (B) licence and a clean driving record.'),
  ('Maths Tutor', 'Grow Learning Centre', 'Dobsonville', 'Dobsonville, Soweto', 'R120/hour', 'Part-time', 'Entry level', '5 km', 'Taxi about R24/day', array['Near me','Part-time']::text[], array['Tutoring','Communication','Matric']::text[], 'Communication', 'Help Grade 8 to 10 learners with homework after school, three afternoons a week.');

insert into public.mentors (initials, name, role, rating, about) values
  ('NL', 'Nomsa L.', 'HR Manager · 8 years', 4.9, 'Helps with CVs, first jobs and interviews.'),
  ('SK', 'Sipho K.', 'Software Developer · 5 years', 4.8, 'Helps with tech careers and learnerships.'),
  ('LM', 'Lindiwe M.', 'Retail Store Manager · 10 years', 4.8, 'Helps with retail, cashier and customer service jobs.'),
  ('AP', 'Ayesha P.', 'Small business owner · 6 years', 4.7, 'Helps with starting a side business and informal work.');
-- AI career coach messages and personal guides.
-- Only edge functions write these (service role), users can read their own rows.

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists coach_messages_user_idx on public.coach_messages (user_id, created_at);

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  topic text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists guides_user_idx on public.guides (user_id, created_at desc);

alter table public.coach_messages enable row level security;
alter table public.guides enable row level security;

drop policy if exists "own rows read" on public.coach_messages;
create policy "own rows read" on public.coach_messages for select to authenticated using (user_id = auth.uid());
drop policy if exists "own rows delete" on public.coach_messages;
create policy "own rows delete" on public.coach_messages for delete to authenticated using (user_id = auth.uid());

drop policy if exists "own rows read" on public.guides;
create policy "own rows read" on public.guides for select to authenticated using (user_id = auth.uid());
drop policy if exists "own rows delete" on public.guides;
create policy "own rows delete" on public.guides for delete to authenticated using (user_id = auth.uid());

revoke insert, update on public.coach_messages, public.guides from anon, authenticated;
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
-- JSearch (Google for Jobs) as a job source: where the post was published and whether the link goes straight to the employer.
alter table public.jobs add column if not exists publisher text;
alter table public.jobs add column if not exists apply_direct boolean;
-- Used to spot the same job posted on several sites
alter table public.jobs add column if not exists dedupe_key text;
create index if not exists jobs_dedupe_idx on public.jobs (dedupe_key);
