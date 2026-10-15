import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { province, category } = await req.json().catch(() => ({}));

    // Fetch recent active listings
    const query = supabase
      .from("listings")
      .select("id, title, category, price_per_unit, unit, province, nearest_town, quantity, photos, created_at, farmer_id")
      .eq("status", "active")
      .gt("quantity", 0)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: listings, error } = await query;
    if (error) throw error;

    // Fetch user's order history for personalization
    let userOrders: any[] = [];
    if (user) {
      const { data: orders } = await supabase
        .from("orders")
        .select("listing_id, created_at, quantity")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      userOrders = orders || [];
    }

    // Build context for AI
    const listingSummary = (listings || []).slice(0, 50).map((l: any) => ({
      id: l.id,
      title: l.title,
      category: l.category,
      price: l.price_per_unit,
      unit: l.unit,
      province: l.province,
      town: l.nearest_town,
      qty: l.quantity,
    }));

    const userContext = user
      ? `User province: ${province || "unknown"}. Recent purchases: ${userOrders.map((o: any) => o.listing_id).join(", ") || "none"}.`
      : "Anonymous user, no purchase history.";

    if (!lovableKey) {
      // Fallback: simple algorithmic recommendations without AI
      const allListings = listings || [];
      const trending = [...allListings].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
      const nearYou = province
        ? allListings.filter((l: any) => l.province === province).slice(0, 8)
        : allListings.slice(0, 8);
      
      // Category-based recommendations
      const purchasedListingIds = userOrders.map((o: any) => o.listing_id);
      const purchasedCategories = allListings
        .filter((l: any) => purchasedListingIds.includes(l.id))
        .map((l: any) => l.category);
      const recommended = purchasedCategories.length > 0
        ? allListings.filter((l: any) => purchasedCategories.includes(l.category) && !purchasedListingIds.includes(l.id)).slice(0, 8)
        : trending.slice(0, 8);

      return new Response(JSON.stringify({
        recommended: recommended.map((l: any) => l.id),
        trending: trending.map((l: any) => l.id),
        nearby: nearYou.map((l: any) => l.id),
        reasoning: "Algorithmic recommendations based on recency and location",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use AI for smart recommendations
    const prompt = `You are a marketplace recommendation engine for an African agricultural marketplace.

Given these available listings:
${JSON.stringify(listingSummary)}

${userContext}
${category ? `User is browsing category: ${category}` : ""}

Return a JSON object with exactly these keys:
- "recommended": array of up to 8 listing IDs most relevant to this user
- "trending": array of up to 8 listing IDs that are trending/popular (newest, variety of categories)
- "nearby": array of up to 8 listing IDs closest to user's province (${province || "any"})
- "reasoning": one sentence explaining your logic

Only return valid JSON, no markdown.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a recommendation engine. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        // Fallback to algorithmic
        const allListings = listings || [];
        const trending = [...allListings].slice(0, 8);
        const nearYou = province ? allListings.filter((l: any) => l.province === province).slice(0, 8) : allListings.slice(0, 8);
        return new Response(JSON.stringify({
          recommended: trending.map((l: any) => l.id),
          trending: trending.map((l: any) => l.id),
          nearby: nearYou.map((l: any) => l.id),
          reasoning: "Fallback recommendations",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse AI response - handle markdown code blocks
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      // Fallback
      const allListings = listings || [];
      parsed = {
        recommended: allListings.slice(0, 8).map((l: any) => l.id),
        trending: allListings.slice(0, 8).map((l: any) => l.id),
        nearby: allListings.slice(0, 8).map((l: any) => l.id),
        reasoning: "Fallback due to parse error",
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Recommendation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
