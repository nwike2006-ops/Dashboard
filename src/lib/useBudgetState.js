import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_INCOME } from '../data/budgetDefaults';
import { useSupabaseState } from './supabaseState';

const DEFAULT_STATE = {
  accounts: DEFAULT_ACCOUNTS,
  categories: DEFAULT_CATEGORIES,
  income: DEFAULT_INCOME,
  merchantMemory: {}, // { normalizedDescription: categoryId } — learned from past corrections
  merchantInfo: {}, // { normalizedDescription: "what this company actually is" } — identifies cryptic merchant names
};

export function useBudgetState() {
  return useSupabaseState('budget', DEFAULT_STATE);
}
