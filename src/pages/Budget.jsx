import { todayStr } from '../lib/storage';

function monthKey(dateStr = todayStr()) {
  return dateStr.slice(0, 7);
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

  function updateCategoryBudget(categoryId, value) {
    setBudgetState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, monthlyBudget: value } : c)),
    }));
  }

  return (
    <>
      <h1 className="page-title">Budget</h1>

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
      </section>
    </>
  );
}
