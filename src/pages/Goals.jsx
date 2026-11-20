import DonutChart from '../components/DonutChart';
import CategoryTrendChart from '../components/CategoryTrendChart';
import LineChart from '../components/LineChart';
import { todayStr } from '../lib/storage';
import { netSpentByCategory } from '../lib/spending';
import { netWorth } from '../lib/budgetMath';
import { netWorthAtMonthEnd } from '../lib/netWorthHistory';
import { monthKey, monthLabel, lastNMonths } from '../lib/dateBuckets';
import { NON_SPENDING_CATEGORY_IDS, categoryColor, OTHER_COLOR } from '../lib/chartColors';

// The "Monarch-style" reporting page — net worth trend, spending breakdown,
// category trends, and savings goals all live here together, separate from
// Overview's day-to-day snapshot (accounts, recent transactions, this
// month's budget).
export default function Goals({ budgetState, setBudgetState, transactions }) {
  const today = todayStr();
  const month = monthKey(today);
  const monthTx = transactions.filter((t) => monthKey(t.date) === month);
  const spentByCategory = netSpentByCategory(monthTx);
  const totalBalance = netWorth(budgetState.accounts);

  const spendingCategories = budgetState.categories.filter((c) => !NON_SPENDING_CATEGORY_IDS.has(c.id));

  const chartMonths = lastNMonths(6);
  const trendMonths = chartMonths.map((key) => {
    const tx = transactions.filter((t) => monthKey(t.date) === key);
    const spentThatMonth = netSpentByCategory(tx);
    return {
      label: monthLabel(key),
      segments: spendingCategories.map((c) => ({
        label: c.name,
        value: spentThatMonth[c.id] || 0,
        color: categoryColor(c.id),
      })),
    };
  });

  // This month uses the live current balance (the month isn't over yet);
  // past months are reconstructed — see netWorthHistory.js for why that's
  // only exact for transaction-backed accounts, not investments.
  const netWorthTrend = chartMonths.map((key) => ({
    label: monthLabel(key),
    value: key === month ? totalBalance : netWorthAtMonthEnd(budgetState.accounts, transactions, key),
  }));

  // This month's spending, grouped into a donut — categories under 5% of
  // the total get folded into "Other" so the chart stays readable instead
  // of a scatter of slivers.
  const pieRaw = spendingCategories
    .map((c) => ({ label: c.name, value: spentByCategory[c.id] || 0, color: categoryColor(c.id) }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  const pieTotal = pieRaw.reduce((s, r) => s + r.value, 0);
  const pieThreshold = pieTotal * 0.05;
  const pieSegments = pieRaw.filter((s) => s.value >= pieThreshold || pieThreshold === 0);
  const otherValue = pieRaw.filter((s) => s.value < pieThreshold && pieThreshold > 0).reduce((s, r) => s + r.value, 0);
  if (otherValue > 0) pieSegments.push({ label: 'Other', value: otherValue, color: OTHER_COLOR });

  const goals = budgetState.goals || [];
  // All-time (not just this month), for goals tracked by "total contributed
  // to this category" (e.g. Roth IRA, Individual Investing) rather than a
  // single account's balance — there's no one dedicated account for those,
  // just a running total of what's been sent that way.
  const allTimeSpentByCategory = netSpentByCategory(transactions);

  function addGoal() {
    setBudgetState((prev) => ({
      ...prev,
      goals: [...(prev.goals || []), { id: crypto.randomUUID(), name: 'New Goal', targetAmount: 0, currentAmount: 0 }],
    }));
  }

  function updateGoal(id, field, value) {
    setBudgetState((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    }));
  }

  function setGoalLink(id, linkedAccountId, linkedCategoryId) {
    setBudgetState((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => (g.id === id ? { ...g, linkedAccountId, linkedCategoryId } : g)),
    }));
  }

  function deleteGoal(id) {
    setBudgetState((prev) => ({ ...prev, goals: (prev.goals || []).filter((g) => g.id !== id) }));
  }

  return (
    <>
      <h1 className="page-title">Goals</h1>

      <section className="card overview-chart-card">
        <div className="card-header">
          <h2>Net worth</h2>
          <span className="pill">${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} today</span>
        </div>
        <LineChart data={netWorthTrend} />
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Spending breakdown</h2>
          <span className="pill">{monthLabel(month)}</span>
        </div>
        {pieSegments.length === 0 ? (
          <p className="module-note">No spending recorded yet this month.</p>
        ) : (
          <DonutChart
            segments={pieSegments}
            centerValue={`$${pieTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            centerLabel="Total"
          />
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Category trends</h2>
          <span className="pill">Last 6 months</span>
        </div>
        <CategoryTrendChart months={trendMonths} />
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Savings goals</h2>
        </div>
        {goals.length === 0 ? (
          <p className="module-note">No goals yet — add one below (e.g. "Emergency fund: $5,000").</p>
        ) : (
          <div className="goals-list">
            {goals.map((g) => {
              // A linked goal's "current" is computed, not typed — either a
              // single account's live balance (e.g. Marcus savings = the
              // emergency fund), or the all-time total sent toward a
              // category with no one dedicated account (Roth IRA,
              // Individual Investing) — instead of a manually-typed number
              // that'd drift out of date.
              const linkedAccount = g.linkedAccountId ? budgetState.accounts.find((a) => a.id === g.linkedAccountId) : null;
              const linkedCategory = g.linkedCategoryId ? budgetState.categories.find((c) => c.id === g.linkedCategoryId) : null;
              const target = Number(g.targetAmount || 0);
              const current = linkedAccount
                ? Number(linkedAccount.balance || 0)
                : linkedCategory
                ? Number(allTimeSpentByCategory[linkedCategory.id] || 0)
                : Number(g.currentAmount || 0);
              const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
              const complete = target > 0 && current >= target;
              return (
                <div className="goal-row" key={g.id}>
                  <div className="goal-row-header">
                    <input
                      type="text"
                      className="goal-name-input"
                      value={g.name}
                      onChange={(e) => updateGoal(g.id, 'name', e.target.value)}
                    />
                    <button type="button" className="category-expand-toggle" onClick={() => deleteGoal(g.id)}>
                      Remove
                    </button>
                  </div>
                  <div className="goal-row-figures">
                    {linkedAccount || linkedCategory ? (
                      <span className="category-type-value goal-linked-value">${current.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    ) : (
                      <span className="category-type-value">
                        $
                        <input
                          type="number"
                          className="budget-input"
                          value={g.currentAmount}
                          onChange={(e) => updateGoal(g.id, 'currentAmount', e.target.value)}
                        />
                      </span>
                    )}
                    <span className="goal-of">of</span>
                    <span className="category-type-value">
                      $
                      <input
                        type="number"
                        className="budget-input"
                        value={g.targetAmount}
                        onChange={(e) => updateGoal(g.id, 'targetAmount', e.target.value)}
                      />
                    </span>
                  </div>
                  <label className="goal-link-label">
                    Track with
                    <select
                      value={g.linkedAccountId ? `acct:${g.linkedAccountId}` : g.linkedCategoryId ? `cat:${g.linkedCategoryId}` : ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) setGoalLink(g.id, null, null);
                        else if (v.startsWith('acct:')) setGoalLink(g.id, v.slice(5), null);
                        else setGoalLink(g.id, null, v.slice(4));
                      }}
                    >
                      <option value="">Manual amount</option>
                      <optgroup label="Account balance">
                        {budgetState.accounts.map((a) => (
                          <option key={a.id} value={`acct:${a.id}`}>
                            {a.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Total contributed">
                        {budgetState.categories
                          .filter((c) => c.id !== 'needs-review')
                          .map((c) => (
                            <option key={c.id} value={`cat:${c.id}`}>
                              {c.name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </label>
                  {target > 0 ? (
                    <>
                      <div className="bar-track">
                        <div className={`bar-fill${complete ? ' complete' : ''}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="module-note">
                        {complete
                          ? 'Goal reached! 🎉'
                          : `$${(target - current).toLocaleString(undefined, { maximumFractionDigits: 0 })} to go`}
                      </p>
                    </>
                  ) : (
                    <p className="module-note">
                      ${current.toLocaleString(undefined, { maximumFractionDigits: 0 })} so far — no target set, just tracking.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className="secondary-btn" onClick={addGoal}>
          + Add goal
        </button>
      </section>
    </>
  );
}
