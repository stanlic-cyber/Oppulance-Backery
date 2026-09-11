const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://829b9b94-e227-4c2b-9eba-bd72fd695d64.lovable.app",
];

function getAllowedOrigins(): string[] {
  const configuredOrigins = Deno.env.get("ALLOWED_ORIGIN");
  return (configuredOrigins ? configuredOrigins.split(",") : defaultAllowedOrigins)
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req?.headers.get("Origin");
  const allowedOrigin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigins()[0],
  "Vary": "Origin",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json", ...extraHeaders },
  });
}

export function errorResponse(message: string, status = 400, req?: Request) {
  return jsonResponse({ error: message }, status, {}, req);
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  return null;
}
