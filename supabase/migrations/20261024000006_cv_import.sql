-- Uploaded CVs for "fill my profile from my CV". Private, each user only sees their own folder.
-- Files are deleted as soon as they have been read.
insert into storage.buckets (id, name, public) values ('cv-uploads', 'cv-uploads', false)
on conflict (id) do nothing;

drop policy if exists "own cv uploads read" on storage.objects;
create policy "own cv uploads read" on storage.objects for select to authenticated
  using (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own cv uploads insert" on storage.objects;
create policy "own cv uploads insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own cv uploads delete" on storage.objects;
create policy "own cv uploads delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
