import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_INCOME } from '../data/budgetDefaults';
import { useSupabaseState } from './supabaseState';

const DEFAULT_STATE = {
  accounts: DEFAULT_ACCOUNTS,
  categories: DEFAULT_CATEGORIES,
  income: DEFAULT_INCOME,
  merchantMemory: {}, // { normalizedDescription: categoryId } — learned from past corrections
  merchantInfo: {}, // { normalizedDescription: "what this company actually is" } — identifies cryptic merchant names
  monthlyBudgetOverrides: {}, // { monthKey: { categoryId: value } } — a one-off target for a specific month (e.g. rent
  // varying because utilities are split in with it), overriding that category's normal fixed budgetValue just for
  // that month — see Budget.jsx
  goals: [], // [{ id, name, targetAmount, currentAmount, targetDate }] — savings goals, separate from monthly budget
  // categories (e.g. "Emergency fund: $2,340 of $5,000"), tracked manually since the amount saved toward a goal
  // isn't necessarily all sitting in one dedicated account — see Overview.jsx
};

export function useBudgetState() {
  return useSupabaseState('budget', DEFAULT_STATE);
}
