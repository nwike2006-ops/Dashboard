import { createClient } from 'npm:@supabase/supabase-js@2';
import { syncTransactions } from '../_shared/syncTransactions.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Plaid calls this directly (not the frontend), so it must be deployed with
// --no-verify-jwt (Plaid has no Supabase auth token to send). It doesn't
// verify Plaid's webhook signature — a personal single-item setup has little
// to gain from someone spuriously triggering a sync, since it only re-pulls
// from Plaid using the access_token already stored server-side; it exposes
// nothing to the caller.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log('Plaid webhook:', body.webhook_type, body.webhook_code);

    const relevant =
      body.webhook_type === 'TRANSACTIONS' &&
      ['SYNC_UPDATES_AVAILABLE', 'INITIAL_UPDATE', 'HISTORICAL_UPDATE', 'DEFAULT_UPDATE'].includes(body.webhook_code);

    if (relevant) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await syncTransactions(supabaseAdmin);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('plaid-webhook failed:', err);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
