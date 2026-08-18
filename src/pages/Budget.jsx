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

export default function Budget({ budgetState, setBudgetState, transactions }) {
  const month = monthKey();
  const monthTx = transactions.filter((t) => monthKey(t.date) === month && t.amount > 0);

  const spentByCategory = {};
  for (const t of monthTx) {
    spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + Number(t.amount);
  }

  const totalBudgeted = budgetState.categories.reduce((sum, c) => sum + Number(c.monthlyBudget || 0), 0);
  const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0);
  const income = monthlyIncome(budgetState.income);
  const leftToBudget = income - totalBudgeted;

  function updateCategoryBudget(categoryId, value) {
    setBudgetState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, monthlyBudget: value } : c)),
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
              {leftToBudget < 0 ? `$${Math.abs(leftToBudget).toFixed(0)} over` : `$${leftToBudget.toFixed(0)} left to budget`}
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
                You've budgeted ${totalBudgeted.toFixed(0)} of that across categories below. Transfers you move around for
                investing (Zelle, Venmo, wires) aren't counted here.
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
            const budget = Number(c.monthlyBudget || 0);
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            const over = budget > 0 && spent > budget;
            return (
              <div className="category-row" key={c.id}>
                <div className="category-row-top">
                  <span>{c.name}</span>
                  <div className="category-row-figures">
                    <span className={`category-figure ${over ? 'over-budget' : ''}`}>
                      <span className="category-figure-label">Spent</span>
                      <span className="category-figure-value">${spent.toFixed(0)}</span>
                    </span>
                    <span className="category-figure">
                      <span className="category-figure-label">Budget</span>
                      <span className="category-figure-value">
                        $
                        <input
                          type="number"
                          className="budget-input"
                          value={c.monthlyBudget}
                          onChange={(e) => updateCategoryBudget(c.id, e.target.value)}
                        />
                      </span>
                    </span>
                  </div>
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
