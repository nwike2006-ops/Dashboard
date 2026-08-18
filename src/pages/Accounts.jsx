import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PlaidConnectButton from '../components/PlaidConnectButton';

function timeAgo(isoString) {
  if (!isoString) return null;
  const minutes = Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Accounts({ budgetState, setBudgetState, plaid }) {
  const [syncing, setSyncing] = useState(false);
  const { linked, lastSyncedAt, reload: reloadPlaidStatus } = plaid;

  function updateBalance(accountId, value) {
    setBudgetState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === accountId ? { ...a, balance: value } : a)),
    }));
  }

  async function syncNow() {
    setSyncing(true);
    const { error } = await supabase.functions.invoke('plaid-sync-transactions');
    if (error) console.error('Manual sync failed:', error);
    await reloadPlaidStatus();
    setSyncing(false);
  }

  const total = budgetState.accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return (
    <>
      <h1 className="page-title">Accounts</h1>

      <section className="card">
        <div className="card-header">
          <h2>Bank connection</h2>
          {linked && <span className="pill pill-good">Connected</span>}
        </div>
        <div className="car-actions">
          {linked ? (
            <>
              <button className="secondary-btn" type="button" onClick={syncNow} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              {lastSyncedAt && <span className="module-note">Last synced {timeAgo(lastSyncedAt)}</span>}
            </>
          ) : (
            <PlaidConnectButton onLinked={reloadPlaidStatus} />
          )}
        </div>
        <p className="module-note">
          {linked ? 'Transactions sync automatically once connected.' : 'Connect a bank to sync transactions automatically, or track balances manually below.'}
        </p>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Account balances</h2>
          <span className="pill">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} total</span>
        </div>
        <div className="accounts-editor">
          {budgetState.accounts.map((a) => (
            <div className="accounts-editor-row" key={a.id}>
              <div>
                <div className="accounts-editor-name">{a.name}</div>
                <div className="accounts-editor-type">{a.type}</div>
              </div>
              <span className="accounts-editor-balance">
                $
                <input
                  type="number"
                  className="budget-input"
                  value={a.balance}
                  onChange={(e) => updateBalance(a.id, e.target.value)}
                />
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
