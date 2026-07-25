-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run.
--
-- No login/accounts — this is a single-user app, and everything lives in one
-- fixed row accessed directly via the anon key. That means anyone holding the
-- Project URL + anon key (i.e. anyone who has this deployed app's URL, since
-- the key ships in the frontend bundle) can read and write this data. Treat
-- the deployed URL as the only thing gating access — don't share or publish it.

create table if not exists app_state (
  id text primary key default 'main',
  bible jsonb not null default '{}'::jsonb,
  workout jsonb not null default '{}'::jsonb,
  car jsonb not null default '{}'::jsonb,
  budget jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "anyone with the anon key can read" on app_state
  for select using (true);

create policy "anyone with the anon key can insert" on app_state
  for insert with check (true);

create policy "anyone with the anon key can update" on app_state
  for update using (true);

-- Photo storage for odometer / oil-change-sticker photos.

insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', false)
on conflict (id) do nothing;

create policy "anyone with the anon key can read photos" on storage.objects
  for select using (bucket_id = 'car-photos');

create policy "anyone with the anon key can upload photos" on storage.objects
  for insert with check (bucket_id = 'car-photos');

create policy "anyone with the anon key can delete photos" on storage.objects
  for delete using (bucket_id = 'car-photos');
