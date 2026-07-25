import { plaidClient } from '../_shared/plaidClient.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`;
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'main' },
      client_name: 'Life Dashboard',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
      webhook: webhookUrl,
    });

    return new Response(JSON.stringify({ link_token: response.data.link_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('plaid-create-link-token failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to create link token' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
