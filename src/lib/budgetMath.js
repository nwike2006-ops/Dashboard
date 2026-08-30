// How many times a year each frequency actually pays out — the basis for
// converting one paycheck into a monthly figure. Weekly (52) and biweekly
// (26) don't divide evenly into 12 months, so most months get one count but
// a few get an extra paycheck; averaging over the full year (× n/12) gives a
// steady monthly figure instead of the number jumping around based on which
// type of month it happens to be. Semi-monthly (24, always the 1st/15th or
// similar fixed dates) and monthly (12) already divide evenly, so for those
// the "average" is just the plain multiplication — no smoothing needed.
const PAYCHECKS_PER_YEAR = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export function monthlyIncome(income) {
  const amount = Number(income?.paycheckAmount || 0);
  const frequency = income?.frequency;
  // Irregular/freelance income has no fixed paycheck size or schedule to
  // convert — the amount entered *is* the monthly figure, typed directly.
  if (frequency === 'irregular' || !PAYCHECKS_PER_YEAR[frequency]) return amount;
  return amount * (PAYCHECKS_PER_YEAR[frequency] / 12);
}

// Turns each category's budgetType/budgetValue into an actual dollar amount
// for the month: 'fixed' is as-typed, 'percent' is a share of income, and
// 'remainder' splits whatever's left of income after every fixed/percent
// category is accounted for (evenly, if more than one category uses it).
export function computeCategoryBudgets(categories, income) {
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
