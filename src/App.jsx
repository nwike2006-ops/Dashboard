import { useState } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import Sidebar, { MobileTabBar } from './components/Sidebar';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Accounts from './pages/Accounts';
import { useBudgetState } from './lib/useBudgetState';
import { useBudgetTransactions } from './lib/useBudgetTransactions';
import { usePlaidStatus } from './lib/usePlaidStatus';
import { netWorth } from './lib/budgetMath';

function App() {
  const [view, setView] = useState('overview');
  const [budgetState, setBudgetState, budgetLoading] = useBudgetState();
  const { transactions, addTransaction, recategorize, setExcluded } = useBudgetTransactions();
  const chasePlaid = usePlaidStatus('chase');
  const schwabPlaid = usePlaidStatus('schwab');
  const marcusPlaid = usePlaidStatus('marcus');
  const creditCardPlaid = usePlaidStatus('creditCard');

  if (budgetLoading) {
    return <div className="loading-screen">Loading your budget…</div>;
  }

  const totalBalance = netWorth(budgetState.accounts);
  // Chase Checking specifically, not net worth — that's the account actually
  // spent from day to day, unlike savings/investing/credit.
  const checkingBalance = budgetState.accounts.find((a) => a.id === 'chase-checking')?.balance ?? null;

  return (
    <div className="app-shell">
      <TopBar checkingBalance={checkingBalance} />
      <div className="app-body">
        <Sidebar view={view} setView={setView} totalBalance={totalBalance} />
        <main className="app-main">
          {view === 'overview' && (
            <Overview budgetState={budgetState} transactions={transactions} setView={setView} />
          )}
          {view === 'transactions' && (
            <Transactions
              budgetState={budgetState}
              setBudgetState={setBudgetState}
              transactions={transactions}
              addTransaction={addTransaction}
              recategorize={recategorize}
              setExcluded={setExcluded}
            />
          )}
          {view === 'budget' && (
            <Budget
              budgetState={budgetState}
              setBudgetState={setBudgetState}
              transactions={transactions}
              recategorize={recategorize}
              setExcluded={setExcluded}
              addTransaction={addTransaction}
            />
          )}
          {view === 'accounts' && (
            <Accounts
              budgetState={budgetState}
              setBudgetState={setBudgetState}
              chasePlaid={chasePlaid}
              schwabPlaid={schwabPlaid}
              marcusPlaid={marcusPlaid}
              creditCardPlaid={creditCardPlaid}
            />
          )}
        </main>
      </div>
      <MobileTabBar view={view} setView={setView} />
    </div>
  );
}

export default App;
