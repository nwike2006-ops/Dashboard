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

// paycheckAmount here is auto-detected from real payroll deposits (see
// isPayrollDeposit in syncTransactions.ts) — auto: true tells the Budget
// page to show it as a detected figure rather than an editable guess.
//
// Locked to once per calendar month: recalculating on every paycheck (twice
// a month) meant percent-of-income and "whatever's left" categories could
// shift their dollar target mid-month, out from under spending the user had
// already been tracking against. `autoUpdatedMonth` records the last month
// this ran, so a paycheck syncing in mid-month is seen and averaged in next
// time, but doesn't move the number again until the month turns over. The
// "Update income now" button on the Budget page bypasses this by writing
// income directly (see useBudgetTransactions.js) rather than calling this
// function, which is intentional — that's the user asking for it early.
export async function setIncome(supabaseAdmin, paycheckAmount) {
  const budget = await loadBudget(supabaseAdmin);
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (budget.income?.autoUpdatedMonth === currentMonth) return;
  await supabaseAdmin.from('app_state').upsert(
    {
      id: 'main',
      budget: { ...budget, income: { paycheckAmount, frequency: 'biweekly', auto: true, autoUpdatedMonth: currentMonth } },
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
