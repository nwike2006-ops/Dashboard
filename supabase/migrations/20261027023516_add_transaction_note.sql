-- A free-text note separate from the transaction's description (which is
-- usually the merchant name from Plaid, e.g. "Venmo" or "Target") — lets the
-- user record what a transaction was actually for.
alter table budget_transactions add column if not exists note text;
