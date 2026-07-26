import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '../lib/supabaseClient';

const LINK_TOKEN_KEY = 'plaid_link_token';

// Chase is an OAuth institution, so completing login sends the browser away
// and back (see plaid-create-link-token's redirect_uri). The link_token has
// to survive that round trip, hence sessionStorage rather than plain state —
// a fresh page load wipes React state but not this.
function isResumingOAuth() {
  return window.location.href.includes('oauth_state_id=');
}

export default function PlaidConnectButton({ onLinked }) {
  const [linkToken, setLinkToken] = useState(() => (isResumingOAuth() ? sessionStorage.getItem(LINK_TOKEN_KEY) : null));
  const [status, setStatus] = useState(() => (isResumingOAuth() && sessionStorage.getItem(LINK_TOKEN_KEY) ? 'linking' : 'idle'));

  async function startConnect() {
    setStatus('loading');
    const { data, error } = await supabase.functions.invoke('plaid-create-link-token');
    if (error || !data?.link_token) {
      console.error('Failed to create link token:', error);
      setStatus('error');
      return;
    }
    sessionStorage.setItem(LINK_TOKEN_KEY, data.link_token);
    setLinkToken(data.link_token);
  }

  const onPlaidSuccess = useCallback(
    async (public_token) => {
      setStatus('linking');
      sessionStorage.removeItem(LINK_TOKEN_KEY);
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

  const onPlaidExit = useCallback((err) => {
    sessionStorage.removeItem(LINK_TOKEN_KEY);
    setLinkToken(null);
    setStatus(err ? 'error' : 'idle');
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
    ...(isResumingOAuth() ? { receivedRedirectUri: window.location.href } : {}),
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  // Once handled, drop the oauth_state_id query param so refreshing this page
  // doesn't try to resume the same (likely already-finished) OAuth flow again.
  useEffect(() => {
    if (isResumingOAuth() && ready) {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
  }, [ready]);

  const label =
    status === 'loading' ? 'Connecting…' : status === 'linking' ? 'Finishing up…' : status === 'error' ? 'Try again' : 'Connect Chase';

  return (
    <button className="secondary-btn" type="button" onClick={startConnect} disabled={status === 'loading' || status === 'linking'}>
      {label}
    </button>
  );
}
