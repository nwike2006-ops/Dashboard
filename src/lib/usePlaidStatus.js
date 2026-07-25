import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// plaid_linked / plaid_last_synced_at live on the public app_state row (safe to
// expose — just status flags, not the actual Plaid access_token, which stays
// server-side only in plaid_items). Subscribes to realtime so the UI flips to
// "connected" right after linking, and "last synced" updates as syncs land.
export function usePlaidStatus() {
  const [linked, setLinked] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const reload = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('plaid_linked, plaid_last_synced_at')
        .eq('id', 'main')
        .maybeSingle();
      if (error) throw error;
      setLinked(!!data?.plaid_linked);
      setLastSyncedAt(data?.plaid_last_synced_at ?? null);
    } catch (err) {
      console.error('Failed to load Plaid status:', err);
    }
  }, []);

  useEffect(() => {
    reload();
    let channel;
    try {
      channel = supabase
        .channel('plaid_status_changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, () => reload())
        .subscribe();
    } catch (err) {
      console.error('Failed to subscribe to Plaid status changes:', err);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [reload]);

  return { linked, lastSyncedAt, reload };
}
