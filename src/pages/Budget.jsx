import { todayStr } from '../lib/storage';

function monthKey(dateStr = todayStr()) {
  return dateStr.slice(0, 7);
}

// Biweekly (every 2 weeks) pays out 26 times a year, not 24 — so most months
// get 2 paychecks but a couple get 3. Averaging over the full year (26/12)
// gives a steadier monthly figure than just multiplying by 2.
function monthlyIncome(income) {
  const amount = Number(income?.paycheckAmount || 0);
  return income?.frequency === 'biweekly' ? amount * (26 / 12) : amount;
}

// Turns each category's budgetType/budgetValue into an actual dollar amount
// for the month: 'fixed' is as-typed, 'percent' is a share of income, and
// 'remainder' splits whatever's left of income after every fixed/percent
// category is accounted for (evenly, if more than one category uses it).
function computeCategoryBudgets(categories, income) {
  const remainderCategories = categories.filter((c) => c.budgetType === 'remainder');
  const allocated = categories
    .filter((c) => c.budgetType !== 'remainder')
    .reduce((sum, c) => {
      const value = Number(c.budgetValue || 0);
      return sum + (c.budgetType === 'percent' ? (value / 100) * income : value);
    }, 0);
  const remainderShare = remainderCategories.length > 0 ? (income - allocated) / remainderCategories.length : 0;

  const budgets = {};
  for (const c of categories) {
    if (c.budgetType === 'percent') budgets[c.id] = (Number(c.budgetValue || 0) / 100) * income;
    else if (c.budgetType === 'remainder') budgets[c.id] = remainderShare;
    else budgets[c.id] = Number(c.budgetValue || 0);
  }
  return budgets;
}

export default function Budget({ budgetState, setBudgetState, transactions }) {
  const month = monthKey();
  const monthTx = transactions.filter((t) => monthKey(t.date) === month && t.amount > 0);

  const spentByCategory = {};
  for (const t of monthTx) {
    spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + Number(t.amount);
  }

  const income = monthlyIncome(budgetState.income);
  const effectiveBudgets = computeCategoryBudgets(budgetState.categories, income);
  const hasRemainderCategory = budgetState.categories.some((c) => c.budgetType === 'remainder');
  const totalBudgeted = Object.values(effectiveBudgets).reduce((a, b) => a + b, 0);
  const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0);
  const leftToBudget = income - totalBudgeted;

  function updateCategory(categoryId, field, value) {
    setBudgetState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, [field]: value } : c)),
    }));
  }

  function updateIncome(field, value) {
    setBudgetState((prev) => ({ ...prev, income: { ...prev.income, [field]: value } }));
  }

  return (
    <>
      <h1 className="page-title">Budget</h1>

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
        {budgetState.income?.auto ? (
          <>
            <p className="module-note">
              Auto-detected from your paycheck deposits — average of the last few: <strong>${Number(budgetState.income.paycheckAmount).toFixed(0)}</strong> every 2 weeks.
            </p>
            {income > 0 && (
              <p className="module-note">
                ≈ ${income.toFixed(0)}/month averaged (26 paychecks a year, not exactly 24, so most months get 2 but some get 3).
                Transfers you move around for investing (Zelle, Venmo, wires) aren't counted here.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="income-form">
              <label>
                Paycheck amount
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
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Once a month</option>
                </select>
              </label>
            </div>
            <p className="module-note">
              No payroll deposits detected yet — this will switch to auto-detected once a transaction with "payroll" in the
              description syncs in.
            </p>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Category budgets</h2>
          <span className="pill">{totalBudgeted > 0 ? `$${totalSpent.toFixed(0)} of $${totalBudgeted.toFixed(0)} this month` : 'Set budgets below to get started'}</span>
        </div>
        <div className="category-bars">
          {budgetState.categories.map((c) => {
            const spent = spentByCategory[c.id] || 0;
            const budget = effectiveBudgets[c.id] || 0;
            const remaining = budget - spent;
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            const over = budget > 0 && spent > budget;
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
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
