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
