import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Cron-only: require shared secret
    const provided = req.headers.get("x-cron-secret");
    const expected = Deno.env.get("CRON_SECRET");
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Process smart notifications for all active users
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();

    // 1. Notify buyers about new listings in their province
    const { data: buyers } = await supabase
      .from("profiles")
      .select("id, province")
      .not("province", "is", null);

    const { data: buyerRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "buyer");

    const buyerIds = new Set((buyerRoles || []).map(r => r.user_id));

    const { data: newListings } = await supabase
      .from("listings")
      .select("id, title, province, category")
      .eq("status", "active")
      .gte("created_at", threeDaysAgo);

    const notifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      link: string;
    }> = [];

    // Check for recent notifications to avoid duplicates
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("user_id, type")
      .gte("created_at", threeDaysAgo)
      .eq("type", "recommendation");

    const recentNotifSet = new Set(
      (recentNotifs || []).map(n => `${n.user_id}-${n.type}`)
    );

    // Province-based new listing alerts for buyers
    (buyers || []).forEach(buyer => {
      if (!buyerIds.has(buyer.id)) return;
      if (recentNotifSet.has(`${buyer.id}-recommendation`)) return;

      const localListings = (newListings || []).filter(l => l.province === buyer.province);
      if (localListings.length >= 2) {
        notifications.push({
          user_id: buyer.id,
          type: "recommendation",
          title: `🌿 ${localListings.length} new listings near you`,
          message: `New produce available in ${buyer.province}: ${localListings.slice(0, 3).map(l => l.title).join(", ")}`,
          link: `/marketplace?province=${encodeURIComponent(buyer.province || "")}`,
        });
      }
    });

    // 2. Notify sellers about pending orders
    const { data: pendingOrders } = await supabase
      .from("orders")
      .select("id, listing_id, created_at")
      .eq("status", "pending")
      .gte("created_at", threeDaysAgo);

    if (pendingOrders && pendingOrders.length > 0) {
      const listingIds = [...new Set(pendingOrders.map(o => o.listing_id))];
      const { data: listings } = await supabase
        .from("listings")
        .select("id, farmer_id, title")
        .in("id", listingIds);

      const sellerOrderMap = new Map<string, string[]>();
      (pendingOrders || []).forEach(order => {
        const listing = (listings || []).find(l => l.id === order.listing_id);
        if (listing) {
          const existing = sellerOrderMap.get(listing.farmer_id) || [];
          existing.push(listing.title);
          sellerOrderMap.set(listing.farmer_id, existing);
        }
      });

      const recentSellerNotifSet = new Set(
        (recentNotifs || []).filter(n => n.type === "order_reminder").map(n => n.user_id)
      );

      sellerOrderMap.forEach((titles, farmerId) => {
        if (recentSellerNotifSet.has(farmerId)) return;
        notifications.push({
          user_id: farmerId,
          type: "order",
          title: `📦 ${titles.length} pending order(s) need your attention`,
          message: `You have orders waiting for: ${titles.slice(0, 3).join(", ")}${titles.length > 3 ? ` +${titles.length - 3} more` : ""}`,
          link: "/my-orders",
        });
      });
    }

    // 3. Notify drivers about available deliveries in their province
    const { data: drivers } = await supabase
      .from("driver_profiles")
      .select("user_id, province")
      .eq("is_online", true)
      .eq("is_available", true);

    const { data: openDeliveries } = await supabase
      .from("delivery_requests")
      .select("id, pickup_province")
      .eq("status", "open");

    (drivers || []).forEach(driver => {
      const localDeliveries = (openDeliveries || []).filter(d => d.pickup_province === driver.province);
      if (localDeliveries.length > 0) {
        notifications.push({
          user_id: driver.user_id,
          type: "delivery",
          title: `🚚 ${localDeliveries.length} delivery request(s) near you`,
          message: `New delivery requests available in ${driver.province}`,
          link: "/driver",
        });
      }
    });

    // Insert all notifications (batch, skip if empty)
    let insertedCount = 0;
    if (notifications.length > 0) {
      const { data: inserted, error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) {
        console.error("Notification insert error:", error);
      }
      insertedCount = notifications.length;
    }

    return new Response(JSON.stringify({
      processed_at: now.toISOString(),
      notifications_sent: insertedCount,
      breakdown: {
        buyer_recommendations: notifications.filter(n => n.type === "recommendation").length,
        seller_reminders: notifications.filter(n => n.type === "order").length,
        driver_alerts: notifications.filter(n => n.type === "delivery").length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Smart notification error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
