import { useState } from 'react';
import { todayStr } from '../lib/storage';

function normalize(desc) {
  return desc.trim().toLowerCase();
}

export default function Transactions({ budgetState, setBudgetState, transactions, addTransaction, recategorize }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    categoryId: budgetState.categories[0].id,
    accountId: budgetState.accounts[0].id,
  });

  function handleDescriptionChange(value) {
    const remembered = budgetState.merchantMemory[normalize(value)];
    setForm((f) => ({ ...f, description: value, categoryId: remembered || f.categoryId }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    await addTransaction({
      date: todayStr(),
      description: form.description.trim(),
      amount: Number(form.amount),
      categoryId: form.categoryId,
      accountId: form.accountId,
    });
    setBudgetState((prev) => ({
      ...prev,
      merchantMemory: { ...prev.merchantMemory, [normalize(form.description)]: form.categoryId },
    }));
    setForm((f) => ({ ...f, description: '', amount: '' }));
  }

  async function handleRecategorize(txId, categoryId) {
    const tx = transactions.find((t) => t.id === txId);
    await recategorize(txId, categoryId);
    if (tx) {
      setBudgetState((prev) => ({ ...prev, merchantMemory: { ...prev.merchantMemory, [normalize(tx.description)]: categoryId } }));
    }
  }

  return (
    <>
      <h1 className="page-title">Transactions</h1>

      <section className="card">
        <div className="card-header">
          <h2>Add a transaction</h2>
          <span className="pill">Positive = expense, negative = income</span>
        </div>
        <form className="tx-form" onSubmit={submit}>
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
            {budgetState.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}>
            {budgetState.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="submit" className="primary-btn">
            Add
          </button>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>All transactions</h2>
          <span className="pill">{transactions.length} total</span>
        </div>
        {transactions.length === 0 ? (
          <p className="module-note">Nothing here yet.</p>
        ) : (
          <div className="tx-table">
            {transactions.map((t) => (
              <div className="tx-row" key={t.id}>
                <span className="tx-date">{t.date.slice(5)}</span>
                <span className="tx-desc">
                  {t.description}
                  {t.source === 'plaid' && <span className="pill tx-source-pill">Synced</span>}
                </span>
                <span className={`tx-amount ${t.amount < 0 ? 'good' : ''}`}>
                  {t.amount < 0 ? '+' : '-'}${Math.abs(Number(t.amount)).toFixed(2)}
                </span>
                <select value={t.categoryId || ''} onChange={(e) => handleRecategorize(t.id, e.target.value)}>
                  {budgetState.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
