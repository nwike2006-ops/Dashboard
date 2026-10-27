import { useState } from 'react';
import { todayStr } from '../lib/storage';
import TxList from '../components/TxList';

function normalize(desc) {
  return desc.trim().toLowerCase();
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

export default function Transactions({ budgetState, setBudgetState, transactions, addTransaction, recategorize, setExcluded }) {
  // Needs Review is for unclear spending, not unclear deposits — money coming
  // in (amount < 0, the reverse of "positive = expense") never belongs here,
  // even if it somehow got flagged that way. Scoped to the current month so
  // old flagged items don't pile up here forever — past months' flagged
  // items are still reachable via the month history nav on the Budget page.
  const currentMonth = monthKey(todayStr());
  const needsReview = transactions.filter(
    (t) => t.categoryId === 'needs-review' && Number(t.amount) > 0 && monthKey(t.date) === currentMonth
  );
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

      {needsReview.length > 0 && (
        <section className="card needs-review-card">
          <div className="card-header">
            <h2>Needs Review</h2>
            <span className="pill">{needsReview.length} flagged</span>
          </div>
          <p className="module-note">
            Paul couldn&apos;t confidently place these — take a look and pick the right category. Older flagged
            items from past months are on the Budget page&apos;s month history.
          </p>
          <TxList
            transactions={needsReview}
            categories={budgetState.categories}
            onRecategorize={handleRecategorize}
            onToggleExcluded={setExcluded}
            merchantInfo={budgetState.merchantInfo}
          />
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <h2>All transactions</h2>
          <span className="pill">{transactions.length} total</span>
        </div>
        <TxList
          transactions={transactions}
          categories={budgetState.categories}
          onRecategorize={handleRecategorize}
          onToggleExcluded={setExcluded}
          merchantInfo={budgetState.merchantInfo}
        />
      </section>
    </>
  );
}
