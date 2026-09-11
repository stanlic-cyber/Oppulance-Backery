// Returns the VAPID public key for client-side push subscription.
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve((req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  const key = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  return new Response(JSON.stringify({ key }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
