-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run.
--
-- No login/accounts — this is a single-user app, and everything lives in one
-- fixed row (or, for transactions, one shared table) accessed directly via
-- the anon key. That means anyone holding the Project URL + anon key (i.e.
-- anyone who has this deployed app's URL, since the key ships in the
-- frontend bundle) can read and write this data. Treat the deployed URL as
-- the only thing gating access — don't share or publish it.

create table if not exists app_state (
  id text primary key default 'main',
  bible jsonb not null default '{}'::jsonb,
  workout jsonb not null default '{}'::jsonb,
  car jsonb not null default '{}'::jsonb,
  budget jsonb not null default '{}'::jsonb, -- accounts, categories, merchantMemory (NOT transactions — see budget_transactions)
  plaid_linked boolean not null default false,
  plaid_last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "anyone with the anon key can read" on app_state
  for select using (true);

create policy "anyone with the anon key can insert" on app_state
  for insert with check (true);

create policy "anyone with the anon key can update" on app_state
  for update using (true);

-- Transactions get their own table (rather than living inside app_state's
-- budget jsonb) so the Plaid sync can upsert/delete individual rows cleanly
-- instead of rewriting one giant blob every time.

create table if not exists budget_transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  description text not null,
  amount numeric not null,
  category_id text,
  account_id text not null default 'chase-checking',
  plaid_transaction_id text unique,
  source text not null default 'manual', -- 'manual' | 'plaid'
  created_at timestamptz not null default now()
);

alter table budget_transactions enable row level security;

create policy "anyone with the anon key can read transactions" on budget_transactions
  for select using (true);

create policy "anyone with the anon key can insert transactions" on budget_transactions
  for insert with check (true);

create policy "anyone with the anon key can update transactions" on budget_transactions
  for update using (true);

create policy "anyone with the anon key can delete transactions" on budget_transactions
  for delete using (true);

-- Enables realtime updates (see src/lib/useBudgetTransactions.js) so a
-- webhook-triggered Plaid sync shows up in the dashboard immediately,
-- without the user needing to refresh.
alter publication supabase_realtime add table budget_transactions;

-- Plaid's access_token grants real read access to the linked bank account, so
-- it must never be reachable via the anon key the frontend uses. This table
-- has RLS enabled with *no* policies at all — only Supabase's service_role
-- key (used exclusively server-side, inside Edge Functions) can bypass RLS
-- and reach it. The frontend/anon key cannot read this table, period.

create table if not exists plaid_items (
  id text primary key default 'main',
  access_token text not null,
  item_id text not null,
  sync_cursor text,
  -- Simple mutex so overlapping webhook deliveries (Plaid fires several right
  -- after linking) can't race each other into re-fetching the same "initial"
  -- batch under different transaction_ids — see syncTransactions.ts.
  syncing boolean not null default false,
  sync_started_at timestamptz,
  created_at timestamptz not null default now()
);

alter table plaid_items enable row level security;

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
