import { plaidClient } from './plaidClient.ts';

// Best-effort mapping from Plaid's own transaction categorization to this
// app's budget category ids (see src/data/budgetDefaults.js — keep in sync
// if those ids ever change). Anything unmapped falls into 'misc'; the user's
// own merchant-memory corrections (see BudgetModule) take over from there,
// same as they do for manually-entered transactions.
const PLAID_CATEGORY_MAP = {
  FOOD_AND_DRINK_GROCERIES: 'groceries',
  FOOD_AND_DRINK_RESTAURANT: 'personal',
  FOOD_AND_DRINK_FAST_FOOD: 'personal',
  FOOD_AND_DRINK_COFFEE: 'personal',
  RENT_AND_UTILITIES_RENT: 'housing',
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: 'utilities',
  RENT_AND_UTILITIES_WATER: 'utilities',
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: 'utilities',
  RENT_AND_UTILITIES_TELEPHONE: 'utilities',
  TRANSPORTATION_GAS: 'transportation',
  TRANSPORTATION_PARKING: 'transportation',
  TRANSPORTATION_PUBLIC_TRANSIT: 'transportation',
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: 'transportation',
  GENERAL_SERVICES_INSURANCE: 'insurance',
  ENTERTAINMENT: 'subscriptions',
  GENERAL_SERVICES_SUBSCRIPTION: 'subscriptions',
  LOAN_PAYMENTS: 'debt',
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: 'debt',
  TRANSFER_OUT: 'savings-goal',
  TRANSFER_OUT_SAVINGS: 'savings-goal',
};

function mapCategory(personalFinanceCategory) {
  const detailed = personalFinanceCategory?.detailed;
  const primary = personalFinanceCategory?.primary;
  return PLAID_CATEGORY_MAP[detailed] || PLAID_CATEGORY_MAP[primary] || 'misc';
}

// Pulls whatever's changed since the last stored cursor (or everything, on
// first run), upserts added/modified transactions, deletes removed ones, and
// saves the new cursor so the next call only fetches what's new.
//
// Plaid can fire several webhooks in quick succession right after linking
// (INITIAL_UPDATE, HISTORICAL_UPDATE, DEFAULT_UPDATE...), and each one calls
// this function. Without a lock, two overlapping calls both read the same
// not-yet-advanced cursor and both ask Plaid for "everything so far" — in
// Sandbox that hands back the same fake merchants but with brand new
// transaction_ids each time, so they don't dedupe and show up as duplicates.
// The claim below makes sure only one sync actually runs at a time; a stale
// lock (crashed mid-sync) expires after 2 minutes so it can't wedge forever.
export async function syncTransactions(supabaseAdmin) {
  const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('plaid_items')
    .update({ syncing: true, sync_started_at: new Date().toISOString() })
    .eq('id', 'main')
    .or(`syncing.eq.false,sync_started_at.lt.${staleThreshold}`)
    .select();
  if (claimError) throw claimError;
  if (!claimed || claimed.length === 0) {
    return { synced: 0, removed: 0, linked: false, skipped: true };
  }

  const item = claimed[0];

  try {
    let cursor = item.sync_cursor;
    const added = [];
    const modified = [];
    const removed = [];
    let hasMore = true;

    while (hasMore) {
      const resp = await plaidClient.transactionsSync({
        access_token: item.access_token,
        cursor: cursor || undefined,
      });
      added.push(...resp.data.added);
      modified.push(...resp.data.modified);
      removed.push(...resp.data.removed);
      hasMore = resp.data.has_more;
      cursor = resp.data.next_cursor;
    }

    for (const txn of [...added, ...modified]) {
      const { error } = await supabaseAdmin.from('budget_transactions').upsert(
        {
          plaid_transaction_id: txn.transaction_id,
          date: txn.date,
          description: txn.merchant_name || txn.name,
          amount: txn.amount, // Plaid: positive = money out, matches this app's convention
          category_id: mapCategory(txn.personal_finance_category),
          account_id: 'chase-checking',
          source: 'plaid',
        },
        { onConflict: 'plaid_transaction_id' }
      );
      if (error) console.error('Failed to upsert transaction:', error);
    }

    for (const txn of removed) {
      const { error } = await supabaseAdmin
        .from('budget_transactions')
        .delete()
        .eq('plaid_transaction_id', txn.transaction_id);
      if (error) console.error('Failed to delete removed transaction:', error);
    }

    await supabaseAdmin.from('plaid_items').update({ sync_cursor: cursor }).eq('id', 'main');

    // plaid_linked/plaid_last_synced_at live on app_state (not plaid_items) because the
    // frontend's anon key can read app_state but is deliberately locked out of plaid_items.
    await supabaseAdmin
      .from('app_state')
      .upsert({ id: 'main', plaid_linked: true, plaid_last_synced_at: new Date().toISOString() }, { onConflict: 'id' });

    return { synced: added.length + modified.length, removed: removed.length, linked: true };
  } finally {
    await supabaseAdmin.from('plaid_items').update({ syncing: false }).eq('id', 'main');
  }
}
