import { plaidClient } from './plaidClient.ts';
import { setAccountBalance, setPlaidStatus, setIncomeSuggestion } from './appState.ts';
import { targetConfig } from './plaidTargets.ts';

// Best-effort mapping from Plaid's own transaction categorization to this
// app's budget category ids (see src/data/budgetDefaults.js — keep in sync
// if those ids ever change).
const PLAID_CATEGORY_MAP = {
  FOOD_AND_DRINK_GROCERIES: 'groceries',
  FOOD_AND_DRINK_RESTAURANT: 'personal',
  FOOD_AND_DRINK_FAST_FOOD: 'personal',
  FOOD_AND_DRINK_COFFEE: 'personal',
  FOOD_AND_DRINK_VENDING_MACHINES: 'personal',
  FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK: 'personal',
  FOOD_AND_DRINK: 'personal', // primary-only fallback for anything Plaid didn't sub-categorize
  RENT_AND_UTILITIES_RENT: 'housing',
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: 'utilities',
  RENT_AND_UTILITIES_WATER: 'utilities',
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: 'utilities',
  RENT_AND_UTILITIES_TELEPHONE: 'utilities',
  TRANSPORTATION_GAS: 'transportation',
  TRANSPORTATION_PARKING: 'transportation',
  TRANSPORTATION_PUBLIC_TRANSIT: 'transportation',
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: 'transportation',
  TRAVEL_RENTAL_CARS: 'transportation',
  TRAVEL_PARKING: 'transportation',
  TRAVEL_LODGING: 'personal',
  TRAVEL_FLIGHTS: 'personal',
  GENERAL_MERCHANDISE_SUPERSTORES: 'groceries',
  GENERAL_MERCHANDISE_DISCOUNT_STORES: 'personal',
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES: 'personal',
  GENERAL_MERCHANDISE_ONLINE_MARKETPLACES: 'personal',
  GENERAL_SERVICES_INSURANCE: 'insurance',
  ENTERTAINMENT: 'personal',
  GENERAL_SERVICES_SUBSCRIPTION: 'subscriptions',
  TRANSFER_OUT: 'savings-goal',
  TRANSFER_OUT_SAVINGS: 'savings-goal',
  TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS: 'savings-goal',
  TRANSFER_OUT_ACCOUNT_TRANSFER: 'savings-goal',
  BANK_FEES: 'personal',
  BANK_FEES_INSUFFICIENT_FUNDS: 'personal',
  BANK_FEES_OTHER_BANK_FEES: 'personal',
};

// Plaid classifies every outgoing Zelle/Venmo/wire as a generic "transfer" —
// it has no idea one of them is actually rent. These override rules are
// checked before PLAID_CATEGORY_MAP for exactly that reason: a known payee
// or recurring pattern is more trustworthy than Plaid's generic P2P-transfer
// guess. Add a line here (not just a merchantMemory entry) for anyone paid
// by Zelle/Venmo/wire whose transfer amount varies or whose description
// carries a unique tracking id each time (merchantMemory's exact-string match
// can't generalize across those).
// "Charles Henry" isn't matched as a fixed phrase — Chase's Zelle memo
// sometimes includes a middle initial ("Charles E Henry") which would break
// an exact substring match, so this allows anything between the two names.
// DoorDash (and other delivery/rideshare apps routed through Cash App/Venmo)
// gets the same override treatment: Plaid classifies P2P-app transactions as
// a generic "transfer" based on the payment rail, not what was purchased —
// that's reliably wrong for a named merchant like this, so it's called out
// here rather than trusting Plaid's category.
const OVERRIDE_RULES = [
  { pattern: /charles\b[\s\S]*?\bhenry\b/i, category: 'housing' },
  // New roommate arrangement (no landlord anymore) — rent now goes to
  // Elijah Booth instead of Charles Henry, same Zelle-dynamic-reference-id
  // problem as that rule, so same flexible-gap pattern.
  { pattern: /elijah\b[\s\S]*?\bbooth\b/i, category: 'housing' },
  { pattern: /doordash|grubhub|uber\s*eats|postmates/i, category: 'personal' },
];

// Plaid's own categorization frequently misses gas stations, restaurant
// chains, and grocery stores whose merchant string carries a store number or
// city suffix — these substring rules catch what PLAID_CATEGORY_MAP misses,
// checked only as a fallback (before finally giving up and landing on 'personal').
const KEYWORD_RULES = [
  { pattern: /fuel|gas station|circle k|quiktrip|\bqt \d|chevron|shell #|exxon|conoco/i, category: 'transportation' },
  {
    pattern:
      /pizza|burger|wingstop|\bsubs\b|diner|grill|\bcafe\b|coffee|\bjuice\b|yogurt|smoothie|\bbar\b|restaurant|waffle|donut|doughnut|\btaco\b|nutrition/i,
    category: 'personal',
  },
  { pattern: /walmart|wm supercenter|costco|trader joe|kroger|safeway|whole foods|\baldi\b/i, category: 'groceries' },
  { pattern: /schwab|\bwise\b|vanguard|fidelity|robinhood|coinbase/i, category: 'savings-goal' },
];

// merchantMemory holds the user's own corrections (see Transactions.jsx) —
// checked first so a merchant, once fixed, stays fixed on every future sync.
// Order matters below: merchantMemory (explicit user correction) beats
// OVERRIDE_RULES (known payee/pattern) beats Plaid's own category (accurate
// for most retail but useless for P2P transfers) beats KEYWORD_RULES
// (last-resort substring guesses) beats 'personal' as the final catch-all.
// Paying off a credit card is money moving between the user's own accounts,
// not new spending — Plaid tags both legs of the transfer (the checking
// withdrawal and the card's payment-received) with this same detailed
// category, so checking it once here handles both sides symmetrically.
// Real purchases on the card keep flowing through mapCategory untouched.
// Checking's side of the payment reliably gets Plaid's
// LOAN_PAYMENTS_CREDIT_CARD_PAYMENT detailed category. The card's own
// payment-received leg doesn't (observed landing as a generic fallback
// instead), so this also matches on the description the card issuer prints
// for its own payment-received line (e.g. "Payment Thank You-Mobile",
// "Payment to Chase card ending in ####") to catch both sides reliably.
function isCreditCardPayment(txn) {
  if (txn.personal_finance_category?.detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT') return true;
  const description = (txn.merchant_name || txn.name || '').trim();
  return /payment\s*thank\s*you|payment to .*card/i.test(description);
}

// Mirrors REFUND_PATTERNS in src/lib/spending.js — kept in sync manually
// since Edge Functions (Deno) can't share a module with the Vite frontend.
// Negative amounts are money coming IN: a paycheck, a P2P transfer, interest,
// or a refund of an earlier purchase. Only the last kind is real spending
// history worth a category (so it nets back against what it refunded) — a
// paycheck or transfer isn't "spending" in any category and was previously
// falling through mapCategory's chain to the 'personal' catch-all by
// accident, which is wrong: it should stay uncategorized (see TxList.jsx's
// "Uncategorized (income)" treatment of a null categoryId).
const KNOWN_REFUND_PATTERNS = [/whoop/i, /marshalls/i, /charles\b[\s\S]*?\bhenry\b/i];

function isKnownRefund(description) {
  return KNOWN_REFUND_PATTERNS.some((pattern) => pattern.test(description || ''));
}

function mapCategory(txn, merchantMemory) {
  const description = (txn.merchant_name || txn.name || '').trim();
  const remembered = merchantMemory[description.toLowerCase()];
  if (remembered) return remembered;

  const overrideMatch = OVERRIDE_RULES.find((rule) => rule.pattern.test(description));
  if (overrideMatch) return overrideMatch.category;

  const detailed = txn.personal_finance_category?.detailed;
  const primary = txn.personal_finance_category?.primary;
  if (PLAID_CATEGORY_MAP[detailed]) return PLAID_CATEGORY_MAP[detailed];
  if (PLAID_CATEGORY_MAP[primary]) return PLAID_CATEGORY_MAP[primary];

  const keywordMatch = KEYWORD_RULES.find((rule) => rule.pattern.test(description));
  if (keywordMatch) return keywordMatch.category;

  return 'personal';
}

// A Plaid Item can expose more than one underlying account (e.g. the same
// Chase login carries both a checking account and a credit card) — if the
// user grants access to more than this target's one intended account during
// Link, every account comes back from Plaid's API regardless. This matches
// Plaid's own per-account `type` field against the target's configured
// plaidType (see plaidTargets.ts) so a sync only ever touches the one
// account it's meant to, instead of lumping everything under one accountId.
async function matchingAccountIds(item) {
  const { data } = await plaidClient.accountsGet({ access_token: item.access_token });
  const expectedType = targetConfig(item.id).plaidType;
  return new Set(data.accounts.filter((a) => a.type === expectedType).map((a) => a.account_id));
}

async function syncBalance(supabaseAdmin, item, accountIds) {
  const { data } = await plaidClient.accountsBalanceGet({ access_token: item.access_token });
  // A credit card's "available" balance is remaining credit limit, not
  // amount owed — using available-first here would show the wrong number
  // entirely, so credit accounts read `current` (what's owed) directly.
  const isCredit = targetConfig(item.id).plaidType === 'credit';
  const total = data.accounts
    .filter((a) => accountIds.has(a.account_id))
    .reduce((sum, a) => sum + (isCredit ? a.balances.current ?? 0 : a.balances.available ?? a.balances.current ?? 0), 0);
  await setAccountBalance(supabaseAdmin, item.account_id, total);
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
// The claim below makes sure only one sync actually runs at a time per item; a
// stale lock (crashed mid-sync) expires after 2 minutes so it can't wedge forever.
export async function syncTransactions(supabaseAdmin, itemRowId) {
  const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('plaid_items')
    .update({ syncing: true, sync_started_at: new Date().toISOString() })
    .eq('id', itemRowId)
    .or(`syncing.eq.false,sync_started_at.lt.${staleThreshold}`)
    .select();
  if (claimError) throw claimError;
  if (!claimed || claimed.length === 0) {
    return { synced: 0, removed: 0, linked: false, skipped: true };
  }

  const item = claimed[0];

  try {
    const { data: stateRow } = await supabaseAdmin.from('app_state').select('budget').eq('id', 'main').maybeSingle();
    const merchantMemory = stateRow?.budget?.merchantMemory || {};
    const accountIds = await matchingAccountIds(item);

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
      if (!accountIds.has(txn.account_id)) continue; // belongs to a different account on this same Item
      const description = txn.merchant_name || txn.name;
      const isIncoming = Number(txn.amount) < 0;
      const categoryId = isCreditCardPayment(txn)
        ? null
        : isIncoming && !isKnownRefund(description)
        ? null // a paycheck/transfer/interest deposit, not spending — leave uncategorized
        : mapCategory(txn, merchantMemory);
      const { error } = await supabaseAdmin.from('budget_transactions').upsert(
        {
          plaid_transaction_id: txn.transaction_id,
          date: txn.date,
          description,
          amount: txn.amount, // Plaid: positive = money out, matches this app's convention
          category_id: categoryId,
          account_id: item.account_id,
          source: 'plaid',
          excluded: isCreditCardPayment(txn),
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

    await supabaseAdmin.from('plaid_items').update({ sync_cursor: cursor }).eq('id', itemRowId);

    try {
      await syncBalance(supabaseAdmin, item, accountIds);
    } catch (err) {
      console.error('Failed to sync balance:', err?.response?.data ?? err?.message ?? err);
    }

    // Runs on every sync, not just ones with a new payroll deposit — cheap to
    // attempt, and setIncomeSuggestion no-ops if nothing's actually changed.
    try {
      // Always the true latest 3 real deposits — there's no need to freeze
      // or exclude the current month here, since this only ever updates a
      // *suggestion* sitting alongside the live income figure (see
      // setIncomeSuggestion). It never touches what the budget actually
      // uses; the user has to explicitly accept it on the Budget page for
      // anything to change, so there's nothing to protect against by timing
      // this carefully — the freshest available suggestion is the most
      // useful one to show them, whenever they get around to looking at it.
      const { data: recentPayroll } = await supabaseAdmin
        .from('budget_transactions')
        .select('amount')
        .ilike('description', '%payroll%')
        .lt('amount', 0)
        .order('date', { ascending: false })
        .limit(3);
      if (recentPayroll && recentPayroll.length > 0) {
        const avg = recentPayroll.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) / recentPayroll.length;
        await setIncomeSuggestion(supabaseAdmin, Math.round(avg * 100) / 100);
      }
    } catch (err) {
      console.error('Failed to update income from payroll:', err?.message ?? err);
    }

    await setPlaidStatus(supabaseAdmin, itemRowId, { linked: true, lastSyncedAt: new Date().toISOString() });

    return { synced: added.length + modified.length, removed: removed.length, linked: true };
  } finally {
    await supabaseAdmin.from('plaid_items').update({ syncing: false }).eq('id', itemRowId);
  }
}
