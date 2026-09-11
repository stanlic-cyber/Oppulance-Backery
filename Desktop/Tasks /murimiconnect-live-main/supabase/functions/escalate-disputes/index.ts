import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";

serve(async (req) => {
  const pre = handlePreflight(req); if (pre) return pre;
  try {
    // Cron-only: require shared secret
    const provided = req.headers.get("x-cron-secret");
    const expected = Deno.env.get("CRON_SECRET");
    if (!expected || provided !== expected) {
      return errorResponse("Forbidden", 403, req);
    }

    const svc = getServiceClient();
    const { data, error } = await svc.rpc("escalate_overdue_disputes");
    if (error) throw error;
    return jsonResponse({ escalated: data ?? 0, ts: new Date().toISOString() }, 200, {}, req);
  } catch (e) {
    console.error("Escalate error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown", 500, req);
  }
});
