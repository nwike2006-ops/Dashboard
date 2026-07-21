import { useState } from 'react';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../data/budgetDefaults';
import { useStored, todayStr } from '../lib/storage';

const DEFAULT_STATE = {
  accounts: DEFAULT_ACCOUNTS,
  categories: DEFAULT_CATEGORIES,
  transactions: [], // { id, date, description, amount, categoryId, accountId }
  merchantMemory: {}, // { normalizedDescription: categoryId } — learned from past corrections
};

export function useBudgetState() {
  return useStored('ld_budget', DEFAULT_STATE);
}

function normalize(desc) {
  return desc.trim().toLowerCase();
}

function currentMonthKey(dateStr = todayStr()) {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

export default function BudgetModule({ state, setState }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    categoryId: state.categories[0].id,
    accountId: state.accounts[0].id,
  });

  const month = currentMonthKey();
  const monthTx = state.transactions.filter((t) => currentMonthKey(t.date) === month);

  const spentByCategory = {};
  for (const t of monthTx) {
    spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + Number(t.amount);
  }

  const totalBudgeted = state.categories.reduce((sum, c) => sum + Number(c.monthlyBudget || 0), 0);
  const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0);

  function updateCategoryBudget(categoryId, value) {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, monthlyBudget: value } : c)),
    }));
  }

  function handleDescriptionChange(value) {
    const remembered = state.merchantMemory[normalize(value)];
    setForm((f) => ({ ...f, description: value, categoryId: remembered || f.categoryId }));
  }

  function addTransaction(e) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    const id = crypto.randomUUID();
    setState((prev) => ({
      ...prev,
      transactions: [
        { id, date: todayStr(), description: form.description.trim(), amount: Number(form.amount), categoryId: form.categoryId, accountId: form.accountId },
        ...prev.transactions,
      ],
      merchantMemory: { ...prev.merchantMemory, [normalize(form.description)]: form.categoryId },
    }));
    setForm((f) => ({ ...f, description: '', amount: '' }));
  }

  function recategorize(txId, categoryId) {
    setState((prev) => {
      const tx = prev.transactions.find((t) => t.id === txId);
      return {
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === txId ? { ...t, categoryId } : t)),
        merchantMemory: tx ? { ...prev.merchantMemory, [normalize(tx.description)]: categoryId } : prev.merchantMemory,
      };
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Budget</h2>
        <span className="pill">{totalBudgeted > 0 ? `$${totalSpent.toFixed(0)} of $${totalBudgeted.toFixed(0)} this month` : 'Set budgets below to get started'}</span>
      </div>

      <form className="tx-form" onSubmit={addTransaction}>
        <input
          type="text"
          placeholder="What'd you spend on?"
          value={form.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="$"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />
        <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
          {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}>
          {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button type="submit" className="primary-btn">Add</button>
      </form>

      <div className="category-bars">
        {state.categories.map((c) => {
          const spent = spentByCategory[c.id] || 0;
          const budget = Number(c.monthlyBudget || 0);
          const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
          const over = budget > 0 && spent > budget;
          return (
            <div className="category-row" key={c.id}>
              <div className="category-row-top">
                <span>{c.name}</span>
                <span className={over ? 'over-budget' : ''}>
                  ${spent.toFixed(0)} / $
                  <input
                    type="number"
                    className="budget-input"
                    value={c.monthlyBudget}
                    onChange={(e) => updateCategoryBudget(c.id, e.target.value)}
                  />
                </span>
              </div>
              <div className="bar-track">
                <div className={`bar-fill${over ? ' over' : ''}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {monthTx.length > 0 && (
        <details className="tx-list">
          <summary>{monthTx.length} transaction{monthTx.length === 1 ? '' : 's'} this month</summary>
          {monthTx.map((t) => (
            <div className="tx-row" key={t.id}>
              <span className="tx-date">{t.date.slice(5)}</span>
              <span className="tx-desc">{t.description}</span>
              <span className="tx-amount">${Number(t.amount).toFixed(2)}</span>
              <select value={t.categoryId} onChange={(e) => recategorize(t.id, e.target.value)}>
                {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ))}
        </details>
      )}
      <p className="module-note">
        Manual entry for now — Chase and Schwab sync land once we wire up Plaid/Schwab's API. Re-categorize anything and it'll remember that merchant next time.
      </p>
    </div>
  );
}
