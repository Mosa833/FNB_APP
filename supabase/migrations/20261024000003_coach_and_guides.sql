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
