import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '../lib/supabaseClient';

export default function PlaidConnectButton({ onLinked }) {
  const [linkToken, setLinkToken] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | linking | error

  async function startConnect() {
    setStatus('loading');
    const { data, error } = await supabase.functions.invoke('plaid-create-link-token');
    if (error || !data?.link_token) {
      console.error('Failed to create link token:', error);
      setStatus('error');
      return;
    }
    setLinkToken(data.link_token);
  }

  const onPlaidSuccess = useCallback(
    async (public_token) => {
      setStatus('linking');
      const { error } = await supabase.functions.invoke('plaid-exchange-token', { body: { public_token } });
      setLinkToken(null);
      if (error) {
        console.error('Failed to exchange token:', error);
        setStatus('error');
        return;
      }
      setStatus('idle');
      onLinked?.();
    },
    [onLinked]
  );

  const onPlaidExit = useCallback(() => {
    setLinkToken(null);
    setStatus('idle');
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const label =
    status === 'loading' ? 'Connecting…' : status === 'linking' ? 'Finishing up…' : status === 'error' ? 'Try again' : 'Connect Chase';

  return (
    <button className="secondary-btn" type="button" onClick={startConnect} disabled={status === 'loading' || status === 'linking'}>
      {label}
    </button>
  );
}
