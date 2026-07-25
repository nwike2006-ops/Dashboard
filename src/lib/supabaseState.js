import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

// Same interface as the old localStorage-backed useStored: [value, setValue] where
// setValue accepts either a value or an updater function. Persists to the
// signed-in user's app_state row instead of the browser's localStorage, so data
// now follows the account rather than the device.
export function useSupabaseState(column, defaultValue) {
  const { user } = useAuth();
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      userIdRef.current = user.id;
      const { data: row, error } = await supabase
        .from('app_state')
        .select(column)
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error(`Failed to load ${column}:`, error);
      setData(row?.[column] ?? defaultValue);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, column]);

  const update = useCallback(
    (next) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        if (userIdRef.current) {
          supabase
            .from('app_state')
            .upsert({ user_id: userIdRef.current, [column]: resolved, updated_at: new Date().toISOString() })
            .then(({ error }) => {
              if (error) console.error(`Failed to save ${column}:`, error);
            });
        }
        return resolved;
      });
    },
    [column]
  );

  return [data, update, loading];
}
