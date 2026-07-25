-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run.
--
-- One row per signed-in user, one jsonb column per module. Mirrors the exact
-- shape each module already keeps in localStorage, so the app code barely
-- changes — only where the state is persisted changes, not its structure.

create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bible jsonb not null default '{}'::jsonb,
  workout jsonb not null default '{}'::jsonb,
  car jsonb not null default '{}'::jsonb,
  budget jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "select own state" on app_state
  for select using (auth.uid() = user_id);

create policy "insert own state" on app_state
  for insert with check (auth.uid() = user_id);

create policy "update own state" on app_state
  for update using (auth.uid() = user_id);

-- Photo storage for odometer / oil-change-sticker photos. Files are stored at
-- car-photos/{user_id}/{photo_id}, and these policies only allow a user to
-- read/write/delete objects under their own folder.

insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', false)
on conflict (id) do nothing;

create policy "select own car photos" on storage.objects
  for select using (bucket_id = 'car-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "insert own car photos" on storage.objects
  for insert with check (bucket_id = 'car-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own car photos" on storage.objects
  for delete using (bucket_id = 'car-photos' and (storage.foldername(name))[1] = auth.uid()::text);
