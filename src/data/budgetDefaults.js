export const DEFAULT_ACCOUNTS = [
  { id: 'chase-checking', name: 'Chase Checking', type: 'checking', balance: 0 },
  { id: 'sofi-savings', name: 'SoFi Savings', type: 'savings', balance: 0 },
  { id: 'schwab', name: 'Schwab', type: 'investing', balance: 0 },
];

export const DEFAULT_CATEGORIES = [
  { id: 'housing', name: 'Rent / Housing', monthlyBudget: 0 },
  { id: 'utilities', name: 'Utilities', monthlyBudget: 0 },
  { id: 'groceries', name: 'Groceries', monthlyBudget: 0 },
  { id: 'transportation', name: 'Transportation / Gas', monthlyBudget: 0 },
  { id: 'subscriptions', name: 'Subscriptions', monthlyBudget: 0 },
  { id: 'personal', name: 'Personal / Discretionary', monthlyBudget: 0 },
  { id: 'savings-goal', name: 'Savings Transfer', monthlyBudget: 0 },
  { id: 'misc', name: 'Miscellaneous', monthlyBudget: 0 },
];

// Income isn't tied to a category — it's a single paycheck-based estimate
// used to show how much of your pay is left after budgeted categories.
export const DEFAULT_INCOME = {
  paycheckAmount: 0,
  frequency: 'biweekly', // 'biweekly' | 'monthly'
};
