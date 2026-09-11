import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Haversine distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Province centroids (approximate lat/lon for Zimbabwe provinces)
const PROVINCE_COORDS: Record<string, [number, number]> = {
  "Harare": [-17.8292, 31.0522],
  "Bulawayo": [-20.1325, 28.6267],
  "Manicaland": [-19.0, 32.5],
  "Mashonaland Central": [-16.8, 31.0],
  "Mashonaland East": [-18.0, 31.8],
  "Mashonaland West": [-17.5, 29.8],
  "Masvingo": [-20.0, 30.8],
  "Matabeleland North": [-19.0, 27.5],
  "Matabeleland South": [-21.0, 29.0],
  "Midlands": [-19.5, 29.8],
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use service role for reading driver data across RLS
    const adminClient = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { delivery_request_id } = await req.json();
    if (!delivery_request_id) {
      return new Response(JSON.stringify({ error: "delivery_request_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the delivery request
    const { data: request, error: reqErr } = await userClient
      .from("delivery_requests")
      .select("*")
      .eq("id", delivery_request_id)
      .single();

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Delivery request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AuthZ: only buyer, seller, or admin can dispatch
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (request.buyer_id !== user.id && request.seller_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only dispatch for open requests
    if (request.status !== "open") {
      return new Response(JSON.stringify({ error: "Request is not open", status: request.status }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pickupCoords = PROVINCE_COORDS[request.pickup_province] || [-17.8, 31.0];

    // Get all online, available drivers with their locations
    const { data: drivers } = await adminClient
      .from("driver_profiles")
      .select("user_id, name, province, is_online, is_available, average_rating, rating_count, total_deliveries, vehicle_type")
      .eq("is_online", true)
      .eq("is_available", true);

    if (!drivers || drivers.length === 0) {
      return new Response(JSON.stringify({
        dispatched: false,
        reason: "No available drivers online",
        suggestions: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get live locations
    const driverIds = drivers.map((d: any) => d.user_id);
    const { data: locations } = await adminClient
      .from("driver_locations")
      .select("driver_id, latitude, longitude, updated_at")
      .in("driver_id", driverIds);

    const locationMap = new Map((locations || []).map((l: any) => [l.driver_id, l]));

    // Score each driver
    const scored = drivers.map((driver: any) => {
      const loc = locationMap.get(driver.user_id);
      let distance = 999;

      if (loc) {
        distance = haversineDistance(pickupCoords[0], pickupCoords[1], Number(loc.latitude), Number(loc.longitude));
      } else {
        // Fallback to province centroid
        const driverCoords = PROVINCE_COORDS[driver.province];
        if (driverCoords) {
          distance = haversineDistance(pickupCoords[0], pickupCoords[1], driverCoords[0], driverCoords[1]);
        }
      }

      const rating = driver.average_rating || 3.0;
      const experience = Math.min(driver.total_deliveries / 50, 1); // normalized 0-1

      // Weighted score: lower is better for distance, higher is better for rating/experience
      const distanceScore = Math.max(0, 1 - distance / 500); // 0-1, 1 being closest
      const ratingScore = rating / 5; // 0-1
      const experienceScore = experience; // 0-1

      const totalScore = distanceScore * 0.5 + ratingScore * 0.3 + experienceScore * 0.2;

      return {
        driver_id: driver.user_id,
        name: driver.name,
        province: driver.province,
        vehicle_type: driver.vehicle_type,
        distance_km: Math.round(distance),
        rating,
        total_deliveries: driver.total_deliveries,
        score: Math.round(totalScore * 100),
        has_gps: !!loc,
        eta_minutes: Math.round(distance * 2.5), // rough estimate: ~25km/h average
      };
    }).sort((a: any, b: any) => b.score - a.score);

    // Return top 5 suggestions (don't auto-assign, let the system suggest)
    const topDrivers = scored.slice(0, 5);

    // Create notifications for top drivers
    for (const driver of topDrivers.slice(0, 3)) {
      await adminClient.from("notifications").insert({
        user_id: driver.driver_id,
        type: "delivery_opportunity",
        title: "New Delivery Opportunity",
        message: `New ${request.cargo_type} delivery from ${request.pickup_province} to ${request.dropoff_province}. You were matched based on proximity and rating.`,
        link: `/driver/delivery/${delivery_request_id}`,
      });
    }

    return new Response(JSON.stringify({
      dispatched: true,
      suggestions: topDrivers,
      pickup: { province: request.pickup_province, town: request.pickup_town },
      dropoff: { province: request.dropoff_province, town: request.dropoff_town },
      notified_count: Math.min(topDrivers.length, 3),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Dispatch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
