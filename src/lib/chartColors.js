// Not real spending — transfers to savings/retirement/investing accounts,
// or a review flag rather than a category — so they're excluded from both
// the spending-breakdown pie and the category-trend chart.
export const NON_SPENDING_CATEGORY_IDS = new Set(['needs-review', 'individual-investing', 'savings-goal', 'roth-ira']);

// Fixed per-category colors (not index-based) so a category's color stays
// the same across the pie chart, the trend chart, and month to month even
// if categories are reordered or some are hidden in a given period.
const CATEGORY_COLORS = {
  housing: '#b9c99a',
  utilities: '#8ca6b9',
  groceries: '#7c8a4f',
  transportation: '#b8842a',
  tithing: '#9a7bb0',
  subscriptions: '#4b9a94',
  personal: '#b0473f',
};
const OTHER_COLOR = '#9b9d8d';

export function categoryColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || OTHER_COLOR;
}

export { OTHER_COLOR };
