-- Replaces the never-actually-used `note` column (a dead end — first pass
-- assumed a user-typed field, but what's actually wanted is Plaid's own
-- transaction context surfaced automatically) with `details`: location,
-- Plaid's category guess, payment channel, and website, populated by the
-- sync so a cryptic description like "Aamodt's Apple Farm" can be expanded
-- for more context without the user typing anything.
alter table budget_transactions drop column if exists note;
alter table budget_transactions add column if not exists details jsonb;
