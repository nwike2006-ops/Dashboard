import { useState } from 'react';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../data/budgetDefaults';
import { todayStr } from '../lib/storage';
import { useSupabaseState } from '../lib/supabaseState';
import { useBudgetTransactions } from '../lib/useBudgetTransactions';
import { usePlaidStatus } from '../lib/usePlaidStatus';
import { supabase } from '../lib/supabaseClient';
import PlaidConnectButton from '../components/PlaidConnectButton';

const DEFAULT_STATE = {
  accounts: DEFAULT_ACCOUNTS,
  categories: DEFAULT_CATEGORIES,
  merchantMemory: {}, // { normalizedDescription: categoryId } — learned from past corrections
};

export function useBudgetState() {
  return useSupabaseState('budget', DEFAULT_STATE);
}

function normalize(desc) {
  return desc.trim().toLowerCase();
}

function currentMonthKey(dateStr = todayStr()) {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

function timeAgo(isoString) {
  if (!isoString) return null;
  const minutes = Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function BudgetModule({ state, setState }) {
  const { transactions, addTransaction: addTx, recategorize: recategorizeTx } = useBudgetTransactions();
  const { linked, lastSyncedAt, reload: reloadPlaidStatus } = usePlaidStatus();
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    categoryId: state.categories[0].id,
    accountId: state.accounts[0].id,
  });

  const month = currentMonthKey();
  const monthTx = transactions.filter((t) => currentMonthKey(t.date) === month);

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

  async function addTransaction(e) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    await addTx({
      date: todayStr(),
      description: form.description.trim(),
      amount: Number(form.amount),
      categoryId: form.categoryId,
      accountId: form.accountId,
    });
    setState((prev) => ({ ...prev, merchantMemory: { ...prev.merchantMemory, [normalize(form.description)]: form.categoryId } }));
    setForm((f) => ({ ...f, description: '', amount: '' }));
  }

  async function recategorize(txId, categoryId) {
    const tx = transactions.find((t) => t.id === txId);
    await recategorizeTx(txId, categoryId);
    if (tx) {
      setState((prev) => ({ ...prev, merchantMemory: { ...prev.merchantMemory, [normalize(tx.description)]: categoryId } }));
    }
  }

  async function syncNow() {
    setSyncing(true);
    const { error } = await supabase.functions.invoke('plaid-sync-transactions');
    if (error) console.error('Manual sync failed:', error);
    await reloadPlaidStatus();
    setSyncing(false);
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Budget</h2>
        <span className="pill">{totalBudgeted > 0 ? `$${totalSpent.toFixed(0)} of $${totalBudgeted.toFixed(0)} this month` : 'Set budgets below to get started'}</span>
      </div>

      <div className="car-actions">
        {linked ? (
          <>
            <span className={`pill pill-good`}>Chase connected</span>
            <button className="secondary-btn" type="button" onClick={syncNow} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            {lastSyncedAt && <span className="module-note">Last synced {timeAgo(lastSyncedAt)}</span>}
          </>
        ) : (
          <PlaidConnectButton onLinked={reloadPlaidStatus} />
        )}
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
              <span className="tx-desc">{t.description}{t.source === 'plaid' && <span className="pill tx-source-pill">Chase</span>}</span>
              <span className="tx-amount">${Number(t.amount).toFixed(2)}</span>
              <select value={t.categoryId || ''} onChange={(e) => recategorize(t.id, e.target.value)}>
                {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ))}
        </details>
      )}
      <p className="module-note">
        {linked
          ? "Chase transactions sync automatically. Schwab investing view is next. Re-categorize anything and it'll remember that merchant next time."
          : 'Manual entry for now, or connect Chase above for automatic sync. Re-categorize anything and it\'ll remember that merchant next time.'}
      </p>
    </div>
  );
}
