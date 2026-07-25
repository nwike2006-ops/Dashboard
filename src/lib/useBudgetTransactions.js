import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

function rowToTx(row) {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    categoryId: row.category_id,
    accountId: row.account_id,
    source: row.source,
  };
}

// Transactions live in their own table (not the app_state jsonb blob) so the
// Plaid sync can upsert/delete individual rows. Subscribes to realtime
// changes so a webhook-triggered sync shows up here without a manual refresh.
export function useBudgetTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) console.error('Failed to load transactions:', error);
      setTransactions((data || []).map(rowToTx));
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    let channel;
    try {
      channel = supabase
        .channel('budget_transactions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_transactions' }, () => {
          reload();
        })
        .subscribe();
    } catch (err) {
      console.error('Failed to subscribe to transaction changes:', err);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [reload]);

  async function addTransaction({ date, description, amount, categoryId, accountId }) {
    try {
      const { error } = await supabase.from('budget_transactions').insert({
        date,
        description,
        amount,
        category_id: categoryId,
        account_id: accountId,
        source: 'manual',
      });
      if (error) console.error('Failed to add transaction:', error);
    } catch (err) {
      console.error('Failed to add transaction:', err);
    }
  }

  async function recategorize(id, categoryId) {
    try {
      const { error } = await supabase.from('budget_transactions').update({ category_id: categoryId }).eq('id', id);
      if (error) console.error('Failed to recategorize transaction:', error);
    } catch (err) {
      console.error('Failed to recategorize transaction:', err);
    }
  }

  return { transactions, loading, addTransaction, recategorize };
}
