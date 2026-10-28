import { useState, useEffect } from 'react';
import { todayStr } from '../lib/storage';
import { netSpentByCategory } from '../lib/spending';
import { monthlyIncome, computeCategoryBudgets } from '../lib/budgetMath';
import TxList from '../components/TxList';

function monthKey(dateStr = todayStr()) {
  return dateStr.slice(0, 7);
}

function shiftMonthKey(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function Budget({ budgetState, setBudgetState, transactions, recategorize, setExcluded, addTransaction }) {
  const [expandedCategories, setExpandedCategories] = useState(() => new Set());
  const currentMonth = monthKey();
  // Lets the user page back through past months to see that month's actual
  // spending and what was flagged Needs Review then — budgets themselves
  // aren't month-specific (same categories/targets every month), only the
  // spending/review data shown below changes with this.
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  function toggleCategory(categoryId) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  const monthTx = transactions.filter((t) => monthKey(t.date) === selectedMonth);
  const spentByCategory = netSpentByCategory(monthTx);

  const income = monthlyIncome(budgetState.income);
  // Needs Review isn't a real spending category — it's a flag, not something to set a
  // dollar target for — so it's excluded from the budget-bar list and shown separately.
  const budgetableCategories = budgetState.categories.filter((c) => c.id !== 'needs-review');
  // Needs Review is for unclear spending, not unclear deposits — money coming in
  // (amount < 0) never belongs here, even if it somehow got flagged that way. Scoped
  // to the selected month so old flagged items from past months don't pile up here
  // forever — paging back via the month nav below still surfaces them.
  const needsReview = monthTx.filter((t) => t.categoryId === 'needs-review' && Number(t.amount) > 0);
  const effectiveBudgets = computeCategoryBudgets(budgetableCategories, income);
  const hasRemainderCategory = budgetableCategories.some((c) => c.budgetType === 'remainder');
  const totalBudgeted = Object.values(effectiveBudgets).reduce((a, b) => a + b, 0);
  const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0);
  const leftToBudget = income - totalBudgeted;

  // Only meaningful for a month that's actually over — mid-month "under
  // budget" just means the month isn't finished yet, not real leftover.
  // This is additional on top of Individual Investing's own fixed monthly
  // amount, not a replacement for it — see the category budget above.
  const isPastMonth = selectedMonth !== currentMonth;
  const leftoverTotal = isPastMonth
    ? budgetableCategories.reduce((sum, c) => {
        if (c.id === 'individual-investing') return sum; // don't suggest investing its own underspend
        const budget = effectiveBudgets[c.id] || 0;
        const spent = spentByCategory[c.id] || 0;
        return sum + Math.max(0, budget - spent);
      }, 0)
    : 0;
  const leftoverDescription = `Leftover from ${monthLabel(selectedMonth)} moved to investing`;
  const leftoverAlreadyLogged = transactions.some((t) => t.description === leftoverDescription);

  // The computed leftoverTotal is just a starting point, not a forced
  // amount — the user can log more or less than what was technically under
  // budget (e.g. round down, or only commit part of it). Resets to the
  // computed total whenever the viewed month changes.
  const [leftoverInput, setLeftoverInput] = useState('');
  const [isEditingLeftover, setIsEditingLeftover] = useState(false);
  useEffect(() => {
    setLeftoverInput(leftoverTotal > 0 ? leftoverTotal.toFixed(2) : '');
    setIsEditingLeftover(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);
  const leftoverAmount = Number(leftoverInput) || 0;

  // Logs the chosen amount as a transaction so the budget reflects it —
  // doesn't move any real money. The user does that transfer themselves,
  // then clicks this to record it.
  async function logLeftoverToInvesting() {
    await addTransaction({
      date: todayStr(),
      description: leftoverDescription,
      amount: Math.round(leftoverAmount * 100) / 100,
      categoryId: 'individual-investing',
      accountId: 'chase-checking',
    });
  }

  function updateCategory(categoryId, field, value) {
    setBudgetState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, [field]: value } : c)),
    }));
  }

  function updateIncome(field, value) {
    setBudgetState((prev) => ({ ...prev, income: { ...prev.income, [field]: value } }));
  }

  // The server (see setIncomeSuggestion in supabase/functions/_shared/appState.ts)
  // computes a suggested paycheck amount from real deposits on every sync, but
  // never applies it — it just sits in suggestedPaycheckAmount until the user
  // clicks to accept it here. Nothing about the live budget numbers moves on
  // its own.
  function handleAcceptIncomeSuggestion() {
    const suggested = budgetState.income?.suggestedPaycheckAmount;
    if (suggested == null) return;
    setBudgetState((prev) => ({
      ...prev,
      income: { ...prev.income, paycheckAmount: suggested, suggestedPaycheckAmount: null },
    }));
  }

  async function handleRecategorize(txId, categoryId) {
    const tx = transactions.find((t) => t.id === txId);
    await recategorize(txId, categoryId);
    if (tx) {
      const key = tx.description.trim().toLowerCase();
      setBudgetState((prev) => ({ ...prev, merchantMemory: { ...prev.merchantMemory, [key]: categoryId } }));
    }
  }

  return (
    <>
      <h1 className="page-title">Budget</h1>

      <div className="month-nav">
        <button
          type="button"
          className="month-nav-btn"
          onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="month-nav-label">{selectedMonth === currentMonth ? 'This month' : monthLabel(selectedMonth)}</span>
        <button
          type="button"
          className="month-nav-btn"
          onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
          disabled={selectedMonth === currentMonth}
          aria-label="Next month"
        >
          ›
        </button>
        {selectedMonth !== currentMonth && (
          <button type="button" className="category-expand-toggle month-nav-today" onClick={() => setSelectedMonth(currentMonth)}>
            Back to this month
          </button>
        )}
      </div>

      {isPastMonth && leftoverTotal > 0 && (
        <section className="card leftover-card">
          <div className="card-header">
            <h2>Leftover from {monthLabel(selectedMonth)}</h2>
            <span className="pill pill-good">${leftoverTotal.toFixed(0)} under budget</span>
          </div>
          {leftoverAlreadyLogged ? (
            <p className="module-note">Already logged to Individual Investing.</p>
          ) : (
            <>
              <p className="module-note">
                You came in ${leftoverTotal.toFixed(2)} under budget this month. This is on top of Individual
                Investing's regular monthly amount, not instead of it. Once you've actually moved that money
                yourself, log it here — this doesn't move any real money, it just records it.
              </p>
              {isEditingLeftover && (
                <span className="leftover-amount-input-wrap leftover-amount-inline">
                  $
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    className="leftover-amount-input"
                    value={leftoverInput}
                    onChange={(e) => setLeftoverInput(e.target.value)}
                    autoFocus
                  />
                </span>
              )}
              <button type="button" className="primary-btn" onClick={logLeftoverToInvesting} disabled={leftoverAmount <= 0}>
                Log ${leftoverAmount.toFixed(2)} to Individual Investing
              </button>
              <button
                type="button"
                className="category-expand-toggle leftover-edit-toggle"
                onClick={() => setIsEditingLeftover((v) => !v)}
              >
                {isEditingLeftover ? 'Done editing' : 'Change amount'}
              </button>
            </>
          )}
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <h2>Income</h2>
          {income > 0 && (
            <span className={`pill ${leftToBudget < 0 ? 'pill-bad' : 'pill-good'}`}>
              {hasRemainderCategory && Math.abs(leftToBudget) < 1
                ? 'Fully allocated'
                : leftToBudget < 0
                ? `$${Math.abs(leftToBudget).toFixed(0)} over`
                : `$${leftToBudget.toFixed(0)} left to budget`}
            </span>
          )}
        </div>
        {/* One box, always editable — no separate "auto" vs "manual" view to
            switch between. Typing here always works, whether or not a
            suggestion below happens to match what's typed. */}
        <div className="income-form">
          <label>
            {budgetState.income?.frequency === 'irregular' ? 'Roughly, per month' : 'Paycheck amount'}
            <input
              type="number"
              inputMode="decimal"
              value={budgetState.income?.paycheckAmount ?? 0}
              onChange={(e) => updateIncome('paycheckAmount', e.target.value)}
            />
          </label>
          <label>
            How often
            <select value={budgetState.income?.frequency ?? 'biweekly'} onChange={(e) => updateIncome('frequency', e.target.value)}>
              <option value="weekly">Every week</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="semimonthly">Twice a month (e.g. 1st &amp; 15th)</option>
              <option value="monthly">Once a month</option>
              <option value="irregular">Irregular / varies</option>
            </select>
          </label>
        </div>
        {income > 0 && (
          <p className="module-note">
            {budgetState.income?.frequency === 'weekly' &&
              `≈ $${income.toFixed(0)}/month averaged (52 paychecks a year, not exactly 48, so most months get 4 but some get 5). `}
            {budgetState.income?.frequency === 'biweekly' &&
              `≈ $${income.toFixed(0)}/month averaged (26 paychecks a year, not exactly 24, so most months get 2 but some get 3). `}
            {budgetState.income?.frequency === 'semimonthly' && `$${income.toFixed(0)}/month (exactly 2 paychecks, every month). `}
            {budgetState.income?.frequency === 'irregular' && `Using $${income.toFixed(0)}/month, as entered. `}
            Transfers you move around for investing (Zelle, Venmo, wires) aren't counted here.
          </p>
        )}

        {/* Plain, always-visible fact — the last-3-paycheck average, whatever
            it currently is — with one button if it differs from what's set
            above. Nothing to switch, dismiss, or click through to see it. */}
        {budgetState.income?.suggestedPaycheckAmount != null && (
          <p className="module-note income-suggestion-line">
            Your last 3 real paychecks averaged <strong>${Number(budgetState.income.suggestedPaycheckAmount).toFixed(0)}</strong>.
            {Math.abs(Number(budgetState.income.suggestedPaycheckAmount) - Number(budgetState.income.paycheckAmount)) > 0.01 && (
              <>
                {' '}
                <button type="button" className="category-expand-toggle" onClick={handleAcceptIncomeSuggestion}>
                  Use this number
                </button>
              </>
            )}
          </p>
        )}
      </section>

      {needsReview.length > 0 && (
        <section className="card">
          <div className="card-header">
            <h2>Needs Review</h2>
            <span className="pill">{needsReview.length} flagged</span>
          </div>
          <p className="module-note">
            Paul couldn&apos;t confidently place these — not a budget line, just sort them into the
            right category below.
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
          <h2>Category budgets</h2>
          <span className="pill">
            {totalBudgeted > 0
              ? `$${totalSpent.toFixed(0)} of $${totalBudgeted.toFixed(0)} ${selectedMonth === currentMonth ? 'this month' : `in ${monthLabel(selectedMonth)}`}`
              : 'Set budgets below to get started'}
          </span>
        </div>
        <div className="category-bars">
          {budgetableCategories.map((c) => {
            const spent = spentByCategory[c.id] || 0;
            const budget = effectiveBudgets[c.id] || 0;
            const remaining = budget - spent;
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            const over = budget > 0 && spent > budget;
            const categoryTx = monthTx.filter((t) => t.categoryId === c.id);
            const isExpanded = expandedCategories.has(c.id);
            return (
              <div className="category-row" key={c.id}>
                <div className="category-row-header">
                  <span className="category-row-name">{c.name}</span>
                  <div className="category-type-control">
                    <select value={c.budgetType} onChange={(e) => updateCategory(c.id, 'budgetType', e.target.value)}>
                      <option value="fixed">Fixed $</option>
                      <option value="percent">% of income</option>
                      <option value="remainder">Whatever's left</option>
                    </select>
                    {c.budgetType !== 'remainder' && (
                      <span className="category-type-value">
                        {c.budgetType === 'percent' ? null : '$'}
                        <input
                          type="number"
                          className="budget-input"
                          value={c.budgetValue}
                          onChange={(e) => updateCategory(c.id, 'budgetValue', e.target.value)}
                        />
                        {c.budgetType === 'percent' ? '%' : null}
                      </span>
                    )}
                  </div>
                </div>

                <div className="category-row-figures">
                  <span className="category-figure">
                    <span className="category-figure-label">Budget</span>
                    <span className="category-figure-value">${budget.toFixed(0)}</span>
                  </span>
                  <span className="category-figure">
                    <span className="category-figure-label">Spent</span>
                    <span className="category-figure-value">${spent.toFixed(0)}</span>
                  </span>
                  <span className={`category-figure ${remaining < 0 ? 'over-budget' : ''}`}>
                    <span className="category-figure-label">Remaining</span>
                    <span className="category-figure-value">${remaining.toFixed(0)}</span>
                  </span>
                </div>

                <div className="bar-track">
                  <div className={`bar-fill${over ? ' over' : ''}`} style={{ width: `${pct}%` }} />
                </div>

                <button
                  type="button"
                  className="category-expand-toggle"
                  onClick={() => toggleCategory(c.id)}
                  disabled={categoryTx.length === 0}
                >
                  {categoryTx.length === 0
                    ? 'No transactions this month'
                    : `${isExpanded ? 'Hide' : 'Show'} ${categoryTx.length} transaction${categoryTx.length === 1 ? '' : 's'} ${isExpanded ? '▴' : '▾'}`}
                </button>

                {isExpanded && categoryTx.length > 0 && (
                  <TxList
                    transactions={categoryTx}
                    categories={budgetState.categories}
                    onRecategorize={handleRecategorize}
                    onToggleExcluded={setExcluded}
                    merchantInfo={budgetState.merchantInfo}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
