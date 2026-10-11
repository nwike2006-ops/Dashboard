// Config per linkable institution. 'id' here is also the plaid_items.id and
// the string the frontend passes as `target` when starting a Link flow.
export const PLAID_TARGETS = {
  chase: {
    institutionName: 'Chase',
    accountType: 'depository',
    accountId: 'chase-checking',
    products: ['transactions'],
    // Plaid's own per-account `type` field (accountsGet/accountsBalanceGet),
    // not this app's accountType above — used to filter which account(s) on
    // the Item a sync actually touches. See plaidAccountFilter in
    // syncTransactions.ts for why this matters: an Item can expose more than
    // one account (e.g. a Chase login with both checking and a credit
    // card), and without this filter a sync blindly lumps every account
    // under this target's single accountId.
    plaidType: 'depository',
  },
  schwab: {
    institutionName: 'Schwab',
    accountType: 'investment',
    accountId: 'schwab',
    products: ['investments'],
    plaidType: 'investment',
  },
  marcus: {
    institutionName: 'Marcus by Goldman Sachs',
    accountType: 'depository',
    accountId: 'marcus-savings',
    products: ['transactions'],
    plaidType: 'depository',
  },
  creditCard: {
    institutionName: 'Credit Card',
    // Reuses the depository sync path (transactions + syncBalance) — the
    // owed-vs-available distinction is handled inside syncBalance, not by a
    // separate accountType branch here.
    accountType: 'depository',
    accountId: 'credit-card',
    products: ['transactions'],
    // Plaid's real type for a credit card account, distinct from checking's
    // 'depository' — this is what actually picks out the right account when
    // the same Chase login exposes both.
    plaidType: 'credit',
  },
};

export function targetConfig(target) {
  const config = PLAID_TARGETS[target];
  if (!config) throw new Error(`Unknown Plaid target: ${target}`);
  return config;
}
