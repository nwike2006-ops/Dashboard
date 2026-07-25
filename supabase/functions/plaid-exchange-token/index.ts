import { createClient } from 'npm:@supabase/supabase-js@2';
import { plaidClient } from '../_shared/plaidClient.ts';
import { syncTransactions } from '../_shared/syncTransactions.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { public_token } = await req.json();
    if (!public_token) throw new Error('Missing public_token');

    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchange.data;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabaseAdmin
      .from('plaid_items')
      .upsert({ id: 'main', access_token, item_id, sync_cursor: null });
    if (error) throw error;

    // Pull the first batch of transactions right away rather than waiting for the webhook.
    const result = await syncTransactions(supabaseAdmin);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('plaid-exchange-token failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to link account' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
