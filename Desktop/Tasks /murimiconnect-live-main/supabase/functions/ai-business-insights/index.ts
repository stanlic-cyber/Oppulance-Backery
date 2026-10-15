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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    // AuthN/Z: admin only
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

    const supabase = createClient(supabaseUrl, serviceKey);

    // Gather platform-wide data for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [
      { data: recentOrders },
      { data: recentListings },
      { count: totalUsers },
      { data: completedOrders },
      { data: cancelledOrders },
      { data: recentDeliveries },
      { data: topSellers },
    ] = await Promise.all([
      supabase.from("orders").select("id, status, quantity, offered_price, total_amount, created_at, buyer_id, listing_id").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }),
      supabase.from("listings").select("id, category, province, created_at, farmer_id, status").gte("created_at", thirtyDaysAgo),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("total_amount, quantity, offered_price").eq("status", "completed").gte("created_at", thirtyDaysAgo),
      supabase.from("orders").select("id").eq("status", "cancelled").gte("created_at", thirtyDaysAgo),
      supabase.from("delivery_requests").select("id, status, created_at").gte("created_at", thirtyDaysAgo),
      supabase.from("listings").select("farmer_id").eq("status", "active"),
    ]);

    // Calculate metrics
    const totalRevenue = (completedOrders || []).reduce((sum, o) =>
      sum + (o.total_amount || o.quantity * o.offered_price || 0), 0);
    const orderCount = (recentOrders || []).length;
    const completedCount = (completedOrders || []).length;
    const cancelledCount = (cancelledOrders || []).length;
    const completionRate = orderCount > 0 ? Math.round((completedCount / orderCount) * 100) : 0;
    const cancellationRate = orderCount > 0 ? Math.round((cancelledCount / orderCount) * 100) : 0;

    // Category distribution
    const categoryMap = new Map<string, number>();
    (recentListings || []).forEach(l => categoryMap.set(l.category, (categoryMap.get(l.category) || 0) + 1));
    const topCategories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Province distribution
    const provinceMap = new Map<string, number>();
    (recentListings || []).forEach(l => provinceMap.set(l.province, (provinceMap.get(l.province) || 0) + 1));
    const topProvinces = Array.from(provinceMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Unique sellers
    const uniqueSellers = new Set((topSellers || []).map(l => l.farmer_id)).size;

    // Delivery stats
    const deliveryCount = (recentDeliveries || []).length;
    const completedDeliveries = (recentDeliveries || []).filter(d => d.status === "completed" || d.status === "delivered").length;
    const deliverySuccessRate = deliveryCount > 0 ? Math.round((completedDeliveries / deliveryCount) * 100) : 0;

    // Weekly trend
    const thisWeekOrders = (recentOrders || []).filter(o => o.created_at >= sevenDaysAgo).length;
    const lastWeekOrders = (recentOrders || []).filter(o => {
      const d = new Date(o.created_at);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
      return d >= fourteenDaysAgo && o.created_at < sevenDaysAgo;
    }).length;
    const weeklyGrowth = lastWeekOrders > 0 ? Math.round(((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100) : 0;

    const metricsContext = `
Platform Metrics (Last 30 Days):
- Total Users: ${totalUsers || 0}
- Active Sellers: ${uniqueSellers}
- New Listings: ${(recentListings || []).length}
- Total Orders: ${orderCount}
- Completed Orders: ${completedCount}
- Cancelled Orders: ${cancelledCount}
- Completion Rate: ${completionRate}%
- Cancellation Rate: ${cancellationRate}%
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Deliveries: ${deliveryCount}
- Delivery Success Rate: ${deliverySuccessRate}%
- Weekly Order Growth: ${weeklyGrowth >= 0 ? '+' : ''}${weeklyGrowth}%
- This Week Orders: ${thisWeekOrders}
- Top Categories: ${topCategories.map(([c, n]) => `${c}(${n})`).join(", ")}
- Top Provinces: ${topProvinces.map(([p, n]) => `${p}(${n})`).join(", ")}
    `.trim();

    if (!lovableKey) {
      // Return raw metrics without AI analysis
      return new Response(JSON.stringify({
        metrics: {
          totalUsers: totalUsers || 0,
          uniqueSellers,
          orderCount,
          completedCount,
          cancelledCount,
          completionRate,
          cancellationRate,
          totalRevenue,
          deliveryCount,
          deliverySuccessRate,
          weeklyGrowth,
          topCategories,
          topProvinces,
        },
        insights: [
          { type: "info", title: "AI insights unavailable", description: "Enable AI to get actionable recommendations." }
        ],
        recommendations: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use AI to generate insights
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a business intelligence analyst for Murimi Connect, an African agricultural marketplace. Analyze the provided metrics and return actionable insights.

Return valid JSON only with this structure:
{
  "insights": [
    { "type": "success|warning|danger|info", "title": "short title", "description": "1-2 sentence insight" }
  ],
  "recommendations": [
    { "priority": "high|medium|low", "action": "specific actionable step", "impact": "expected outcome" }
  ],
  "summary": "2-3 sentence executive summary"
}

Provide 4-6 insights and 3-5 recommendations. Focus on actionable data, not obvious observations.`
          },
          { role: "user", content: metricsContext },
        ],
        temperature: 0.3,
      }),
    });

    let aiInsights = null;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        aiInsights = JSON.parse(clean);
      } catch {
        console.error("Failed to parse AI insights");
      }
    }

    return new Response(JSON.stringify({
      metrics: {
        totalUsers: totalUsers || 0,
        uniqueSellers,
        orderCount,
        completedCount,
        cancelledCount,
        completionRate,
        cancellationRate,
        totalRevenue,
        deliveryCount,
        deliverySuccessRate,
        weeklyGrowth,
        topCategories,
        topProvinces,
      },
      ...(aiInsights || {
        insights: [{ type: "info", title: "Analysis pending", description: "AI analysis could not be completed at this time." }],
        recommendations: [],
        summary: `${orderCount} orders processed with $${totalRevenue.toFixed(2)} revenue. ${completionRate}% completion rate.`,
      }),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Business insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
