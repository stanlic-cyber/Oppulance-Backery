// Lightweight health probe for the public status page.
// Returns 200 quickly; CORS-safe for browser preflights.

import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve((req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({ status: 'ok', service: 'edge-functions', ts: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
