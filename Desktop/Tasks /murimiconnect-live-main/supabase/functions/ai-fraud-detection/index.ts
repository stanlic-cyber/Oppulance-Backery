import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Allow either admin JWT OR cron shared secret
    const cronProvided = req.headers.get("x-cron-secret");
    const cronExpected = Deno.env.get("CRON_SECRET");
    const isCron = !!cronExpected && cronProvided === cronExpected;

    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();

    const flags: Array<{
      user_id: string;
      risk_type: string;
      risk_level: "low" | "medium" | "high" | "critical";
      description: string;
      evidence: Record<string, any>;
    }> = [];

    // 1. Detect accounts with abnormally high cancellation rates
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("buyer_id, status")
      .gte("created_at", sevenDaysAgo);

    const buyerOrderMap = new Map<string, { total: number; cancelled: number }>();
    (recentOrders || []).forEach(o => {
      const entry = buyerOrderMap.get(o.buyer_id) || { total: 0, cancelled: 0 };
      entry.total++;
      if (o.status === "cancelled" || o.status === "rejected") entry.cancelled++;
      buyerOrderMap.set(o.buyer_id, entry);
    });

    buyerOrderMap.forEach((stats, buyerId) => {
      if (stats.total >= 3 && stats.cancelled / stats.total > 0.7) {
        flags.push({
          user_id: buyerId,
          risk_type: "high_cancellation_rate",
          risk_level: "high",
          description: `${stats.cancelled}/${stats.total} orders cancelled in 7 days (${Math.round(stats.cancelled / stats.total * 100)}%)`,
          evidence: { total_orders: stats.total, cancelled_orders: stats.cancelled },
        });
      }
    });

    // 2. Detect duplicate/spam listings from same seller
    const { data: recentListings } = await supabase
      .from("listings")
      .select("farmer_id, title, created_at")
      .gte("created_at", oneDayAgo);

    const sellerListingMap = new Map<string, string[]>();
    (recentListings || []).forEach(l => {
      const titles = sellerListingMap.get(l.farmer_id) || [];
      titles.push(l.title);
      sellerListingMap.set(l.farmer_id, titles);
    });

    sellerListingMap.forEach((titles, farmerId) => {
      if (titles.length >= 5) {
        flags.push({
          user_id: farmerId,
          risk_type: "spam_listings",
          risk_level: "medium",
          description: `${titles.length} listings created in 24 hours`,
          evidence: { listing_count: titles.length, sample_titles: titles.slice(0, 3) },
        });
      }
      // Check for duplicate titles
      const titleSet = new Set(titles.map(t => t.toLowerCase().trim()));
      if (titles.length >= 3 && titleSet.size < titles.length * 0.5) {
        flags.push({
          user_id: farmerId,
          risk_type: "duplicate_listings",
          risk_level: "high",
          description: `${titles.length} listings with many duplicate titles`,
          evidence: { total: titles.length, unique: titleSet.size },
        });
      }
    });

    // 3. Detect drivers with repeated cancellations
    const { data: recentDeliveries } = await supabase
      .from("delivery_requests")
      .select("assigned_driver_id, status")
      .gte("created_at", sevenDaysAgo)
      .not("assigned_driver_id", "is", null);

    const driverDeliveryMap = new Map<string, { total: number; failed: number }>();
    (recentDeliveries || []).forEach(d => {
      if (!d.assigned_driver_id) return;
      const entry = driverDeliveryMap.get(d.assigned_driver_id) || { total: 0, failed: 0 };
      entry.total++;
      if (d.status === "cancelled" || d.status === "failed") entry.failed++;
      driverDeliveryMap.set(d.assigned_driver_id, entry);
    });

    driverDeliveryMap.forEach((stats, driverId) => {
      if (stats.total >= 3 && stats.failed / stats.total > 0.6) {
        flags.push({
          user_id: driverId,
          risk_type: "unreliable_driver",
          risk_level: "high",
          description: `${stats.failed}/${stats.total} deliveries failed/cancelled`,
          evidence: stats,
        });
      }
    });

    // 4. Detect new accounts placing many orders quickly
    const { data: newUsers } = await supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", sevenDaysAgo);

    const newUserIds = new Set((newUsers || []).map(u => u.id));
    buyerOrderMap.forEach((stats, buyerId) => {
      if (newUserIds.has(buyerId) && stats.total >= 5) {
        flags.push({
          user_id: buyerId,
          risk_type: "suspicious_new_account",
          risk_level: "medium",
          description: `New account placed ${stats.total} orders in first week`,
          evidence: { orders: stats.total },
        });
      }
    });

    // 5. Store flags as admin notifications
    if (flags.length > 0) {
      // Get admin user IDs
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminIds = (admins || []).map(a => a.user_id);

      // Create notifications for each admin (batch)
      const criticalFlags = flags.filter(f => f.risk_level === "critical" || f.risk_level === "high");
      if (criticalFlags.length > 0 && adminIds.length > 0) {
        const notifications = adminIds.map(adminId => ({
          user_id: adminId,
          type: "security",
          title: `🚨 ${criticalFlags.length} fraud alert(s) detected`,
          message: criticalFlags.map(f => `${f.risk_type}: ${f.description}`).join("; "),
          link: "/admin/users",
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }

    return new Response(JSON.stringify({
      scan_time: now.toISOString(),
      total_flags: flags.length,
      flags,
      summary: {
        critical: flags.filter(f => f.risk_level === "critical").length,
        high: flags.filter(f => f.risk_level === "high").length,
        medium: flags.filter(f => f.risk_level === "medium").length,
        low: flags.filter(f => f.risk_level === "low").length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Fraud detection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
