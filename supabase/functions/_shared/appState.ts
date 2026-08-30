import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './budgetDefaults.ts';

async function loadBudget(supabaseAdmin) {
  const { data: stateRow } = await supabaseAdmin.from('app_state').select('budget').eq('id', 'main').maybeSingle();
  return stateRow?.budget && Object.keys(stateRow.budget).length > 0
    ? stateRow.budget
    : { accounts: DEFAULT_ACCOUNTS, categories: DEFAULT_CATEGORIES, merchantMemory: {} };
}

export async function setAccountBalance(supabaseAdmin, accountId, balance) {
  const budget = await loadBudget(supabaseAdmin);
  const accounts = (budget.accounts || DEFAULT_ACCOUNTS).map((a) => (a.id === accountId ? { ...a, balance } : a));
  await supabaseAdmin
    .from('app_state')
    .upsert({ id: 'main', budget: { ...budget, accounts }, updated_at: new Date().toISOString() }, { onConflict: 'id' });
}

// Suggests a paycheck amount based on real payroll deposits (any description
// containing "payroll" — see syncTransactions.ts) — but never applies it.
// Recalculating income automatically on every paycheck used to shift
// percent-of-income and "whatever's left" category targets mid-month, out
// from under spending the user had already been tracking against. Rather
// than solve that with a lock/freeze on an automatic write, this never
// writes `paycheckAmount` at all — it only ever updates a separate
// `suggestedPaycheckAmount` sitting alongside it. The Budget page shows that
// suggestion and lets the user explicitly accept or dismiss it (see
// Budget.jsx) — nothing about their live budget numbers ever changes without
// them clicking something. This also sidesteps needing to reason about pay
// frequency or "what counts as this month" at all: a suggestion sitting
// unapplied is harmless no matter when it was computed.
export async function setIncomeSuggestion(supabaseAdmin, suggestedPaycheckAmount) {
  const budget = await loadBudget(supabaseAdmin);
  if (budget.income?.suggestedPaycheckAmount === suggestedPaycheckAmount) return; // no-op, avoid a pointless write
  await supabaseAdmin.from('app_state').upsert(
    {
      id: 'main',
      budget: { ...budget, income: { ...budget.income, suggestedPaycheckAmount } },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

// plaid_status lives on app_state (not plaid_items) because the frontend's
// anon key can read app_state but is deliberately locked out of plaid_items.
export async function setPlaidStatus(supabaseAdmin, target, patch) {
  const { data: stateRow } = await supabaseAdmin.from('app_state').select('plaid_status').eq('id', 'main').maybeSingle();
  const plaidStatus = stateRow?.plaid_status || {};
  await supabaseAdmin.from('app_state').upsert(
    {
      id: 'main',
      plaid_status: { ...plaidStatus, [target]: { ...plaidStatus[target], ...patch } },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}
