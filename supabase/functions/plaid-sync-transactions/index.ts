import { createClient } from 'npm:@supabase/supabase-js@2';
import { syncTransactions } from '../_shared/syncTransactions.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Manual "sync now" trigger — the webhook covers ongoing updates, but this is
// handy right after linking or if you just want to force a refresh.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const result = await syncTransactions(supabaseAdmin);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('plaid-sync-transactions failed:', err);
    return new Response(JSON.stringify({ error: 'Sync failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
