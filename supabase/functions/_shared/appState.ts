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

// Mirrors monthlyIncome/computeCategoryBudgets in src/lib/budgetMath.js and
// netSpentByCategory's refund logic in src/lib/spending.js — kept in sync
// manually since Edge Functions (Deno) can't share a module with the Vite
// frontend.
const PAYCHECKS_PER_YEAR = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

function monthlyIncome(income) {
  const amount = Number(income?.paycheckAmount || 0);
  const frequency = income?.frequency;
  if (frequency === 'irregular' || !PAYCHECKS_PER_YEAR[frequency]) return amount;
  return amount * (PAYCHECKS_PER_YEAR[frequency] / 12);
}

// 'actual' mirrors src/lib/budgetMath.js: the budget just equals whatever
// was actually spent, so it's structurally never "over" (used for rent,
// where the real total varies and there's no fixed target). Requires
// spentByCategory to resolve.
function computeCategoryBudgets(categories, income, spentByCategory = {}) {
  const remainderCategories = categories.filter((c) => c.budgetType === 'remainder');
  const allocated = categories
    .filter((c) => c.budgetType !== 'remainder')
    .reduce((sum, c) => {
      if (c.budgetType === 'actual') return sum + Number(spentByCategory[c.id] || 0);
      const value = Number(c.budgetValue || 0);
      return sum + (c.budgetType === 'percent' ? (value / 100) * income : value);
    }, 0);
  const remainderShare = remainderCategories.length > 0 ? (income - allocated) / remainderCategories.length : 0;
  const budgets = {};
  for (const c of categories) {
    if (c.budgetType === 'percent') budgets[c.id] = (Number(c.budgetValue || 0) / 100) * income;
    else if (c.budgetType === 'remainder') budgets[c.id] = remainderShare;
    else if (c.budgetType === 'actual') budgets[c.id] = Number(spentByCategory[c.id] || 0);
    else budgets[c.id] = Number(c.budgetValue || 0);
  }
  return budgets;
}

const KNOWN_REFUND_PATTERNS = [/whoop/i, /marshalls/i, /charles\b[\s\S]*?\bhenry\b/i];
function isKnownRefund(description) {
  return KNOWN_REFUND_PATTERNS.some((pattern) => pattern.test(description || ''));
}

function netSpentByCategory(transactions) {
  const totals = {};
  for (const t of transactions) {
    if (t.excluded) continue;
    const amount = Number(t.amount);
    if (amount > 0) totals[t.category_id] = (totals[t.category_id] || 0) + amount;
    else if (isKnownRefund(t.description)) totals[t.category_id] = (totals[t.category_id] || 0) + amount;
  }
  return totals;
}

// Savings/investment categories aren't spending caps — going over on these
// means more money moved to savings than planned, not overspending, so
// they're excluded from the "you went over budget" alert entirely.
const NON_SPENDING_CATEGORY_IDS = new Set(['individual-investing', 'savings-goal', 'roth-ira']);

// Checks every real spending category against this month's budget and sends
// a push notification (via ntfy.sh — free, no account needed) the first
// time a category crosses over, tracked in budget.overBudgetAlerts so it
// doesn't re-alert on every subsequent transaction in an already-over
// category. Runs after every sync (manual or webhook-triggered), since
// that's the only point where new spending arrives without the user having
// the app open. No-ops if NTFY_TOPIC isn't configured.
export async function checkAndSendBudgetAlerts(supabaseAdmin) {
  const ntfyTopic = Deno.env.get('NTFY_TOPIC');
  if (!ntfyTopic) return;

  const budget = await loadBudget(supabaseAdmin);
  const categories = budget.categories || DEFAULT_CATEGORIES;
  const income = monthlyIncome(budget.income);
  // 'actual'-type categories (e.g. rent) are excluded here too, not just
  // relying on the math working out — their budget is defined to equal
  // whatever was spent, so "over" isn't a real condition for them.
  const budgetable = categories.filter(
    (c) => c.id !== 'needs-review' && !NON_SPENDING_CATEGORY_IDS.has(c.id) && c.budgetType !== 'actual'
  );

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${monthKey}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: monthTx } = await supabaseAdmin
    .from('budget_transactions')
    .select('category_id, amount, excluded, description')
    .gte('date', monthStart)
    .lt('date', monthEnd);

  const spentByCategory = netSpentByCategory(monthTx || []);
  const effectiveBudgets = computeCategoryBudgets(
    categories.filter((c) => c.id !== 'needs-review'),
    income,
    spentByCategory
  );

  const alertState =
    budget.overBudgetAlerts?.month === monthKey ? budget.overBudgetAlerts : { month: monthKey, categories: [] };
  const alreadyAlerted = new Set(alertState.categories);
  const newlyAlerted = [];
  const failures = [];

  for (const c of budgetable) {
    const limit = effectiveBudgets[c.id] || 0;
    const spent = spentByCategory[c.id] || 0;
    if (limit > 0 && spent > limit && !alreadyAlerted.has(c.id)) {
      const over = spent - limit;
      try {
        const res = await fetch(`https://ntfy.sh/${ntfyTopic}`, {
          method: 'POST',
          headers: { Title: `${c.name}: over budget`, Priority: 'default' },
          body: `Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} budgeted this month — $${over.toFixed(2)} over.`,
        });
        if (!res.ok) {
          // A non-2xx response doesn't throw — fetch only throws on network
          // failure — so this must be checked explicitly, or a silently
          // rejected notification gets marked as sent and never retried.
          failures.push({ category: c.id, status: res.status, body: await res.text().catch(() => '') });
          continue;
        }
        newlyAlerted.push(c.id);
      } catch (err) {
        failures.push({ category: c.id, error: err?.message ?? String(err) });
      }
    }
  }

  if (newlyAlerted.length > 0) {
    await supabaseAdmin.from('app_state').upsert(
      {
        id: 'main',
        budget: { ...budget, overBudgetAlerts: { month: monthKey, categories: [...alertState.categories, ...newlyAlerted] } },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  }

  if (failures.length > 0) console.error('Budget alerts failed to send:', JSON.stringify(failures));
}

// Mirrors isPayrollDeposit in src/lib/income.js.
function isPayrollDeposit(description) {
  return /payroll/i.test(description || '');
}

// Fires once per MONTH, on that month's first paycheck only (tracked in
// budget.paycheckReminderSent) — the user invests the full monthly amounts
// in one lump sum off the first check, not split across every paycheck, so
// a second/third paycheck later that month should stay silent. Shows the
// full Roth IRA / Individual Investing monthly targets, not divided. Only
// ever called with brand-new "added" transactions (never "modified"), so a
// pending→posted update to the same transaction_id can't trigger this
// independently of the once-per-month guard. No-ops if NTFY_TOPIC isn't
// configured.
export async function checkAndSendPaycheckReminder(supabaseAdmin, newTransactions) {
  const ntfyTopic = Deno.env.get('NTFY_TOPIC');
  if (!ntfyTopic) return;

  const payrollTxns = (newTransactions || [])
    .filter((txn) => Number(txn.amount) < 0 && isPayrollDeposit(txn.merchant_name || txn.name))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (payrollTxns.length === 0) return;

  let budget = await loadBudget(supabaseAdmin);
  const categories = budget.categories || DEFAULT_CATEGORIES;
  const rothMonthly = Number(categories.find((c) => c.id === 'roth-ira')?.budgetValue || 0);
  const investMonthly = Number(categories.find((c) => c.id === 'individual-investing')?.budgetValue || 0);

  for (const txn of payrollTxns) {
    const monthKey = txn.date.slice(0, 7); // 'YYYY-MM'
    if (budget.paycheckReminderSent?.month === monthKey) continue; // already sent for this month

    const amount = Math.abs(Number(txn.amount));
    const lines = [];
    if (rothMonthly > 0) lines.push(`$${rothMonthly.toFixed(0)} → Roth IRA`);
    if (investMonthly > 0) lines.push(`$${investMonthly.toFixed(0)} → Individual Investing`);
    const body =
      lines.length > 0
        ? `First paycheck of the month: $${amount.toFixed(2)} deposited. Send this month's amounts: ${lines.join(', ')}.`
        : `First paycheck of the month: $${amount.toFixed(2)} deposited. Time to invest!`;

    try {
      const res = await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: 'POST',
        headers: { Title: 'Paycheck deposited — invest it', Priority: 'default' },
        body,
      });
      if (!res.ok) {
        console.error('ntfy rejected paycheck reminder:', res.status, await res.text().catch(() => ''));
        continue; // don't mark as sent if it didn't actually go out
      }
      budget = { ...budget, paycheckReminderSent: { month: monthKey } };
      await supabaseAdmin
        .from('app_state')
        .upsert({ id: 'main', budget, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    } catch (err) {
      console.error('Failed to send paycheck reminder:', err?.message ?? err);
    }
  }
}
