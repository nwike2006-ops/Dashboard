// Reconstructs net worth at the end of a past month by walking each
// account's CURRENT balance backward, undoing every transaction dated
// after that month-end — accurate for any account whose balance is fully
// driven by synced transactions (checking, savings, credit card). An
// investment account has no per-trade transaction history (investment_
// holdings is a point-in-time snapshot, replaced wholesale on each sync —
// see syncHoldings.ts), so it can't be reconstructed this way and is held
// flat at its current balance for every past month instead.
//
// Sign convention (see useBudgetTransactions.js): amount positive = money
// out. For a cash/debt-free account that decreases the balance, so undoing
// a later transaction means adding it back. For a credit account (the
// balance IS the amount owed) a purchase increases the balance instead, so
// undoing it subtracts — the opposite direction.
export function netWorthAtMonthEnd(accounts, transactions, monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthEndStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return accounts.reduce((sum, a) => {
    let balance = Number(a.balance || 0);
    if (a.type !== 'investing') {
      const laterSum = transactions
        .filter((t) => t.accountId === a.id && t.date > monthEndStr)
        .reduce((s, t) => s + Number(t.amount), 0);
      balance += (a.type === 'credit' ? -1 : 1) * laterSum;
    }
    return sum + (a.type === 'credit' ? -balance : balance);
  }, 0);
}
