import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pending_action_id } = await req.json();
    if (!pending_action_id || typeof pending_action_id !== "string") {
      return new Response(JSON.stringify({ error: "pending_action_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: action, error: fetchErr } = await supabase
      .from("ai_pending_actions")
      .select("*")
      .eq("id", pending_action_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !action) {
      return new Response(JSON.stringify({ error: "Action not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action.status !== "pending") {
      return new Response(JSON.stringify({ error: `Action already ${action.status}` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(action.expires_at) < new Date()) {
      await supabase.from("ai_pending_actions").update({ status: "expired" }).eq("id", action.id);
      return new Response(JSON.stringify({ error: "Action expired — please ask again" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = action.payload || {};
    let result: any = {};

    try {
      if (action.action_type === "place_order") {
        if (!p.listing_id || !p.quantity || !p.offered_price) throw new Error("Missing order fields");

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(String(p.listing_id))) throw new Error("Invalid listing ID format");

        // Validate numeric inputs
        const quantity = Number(p.quantity);
        const offeredPrice = Number(p.offered_price);
        if (isNaN(quantity) || isNaN(offeredPrice) || quantity <= 0 || offeredPrice <= 0) {
          throw new Error("Quantity and price must be positive numbers");
        }

        const { data: listing } = await supabase
          .from("listings")
          .select("id, farmer_id, price_per_unit, quantity, status")
          .eq("id", p.listing_id).maybeSingle();
        if (!listing || listing.status !== "active") throw new Error("Listing unavailable");
        if (listing.farmer_id === user.id) throw new Error("You cannot order your own listing");
        if (quantity > Number(listing.quantity)) throw new Error("Quantity exceeds available stock");

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_verified_at")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile?.phone_verified_at) {
          throw new Error("Please verify your phone number before placing an order");
        }

        const subtotal = quantity * offeredPrice;
        const fee_percent = 5;
        const fee_amount = +(subtotal * 0.05).toFixed(2);
        const total = +(subtotal + fee_amount).toFixed(2);

        const { data: order, error } = await supabase.from("orders").insert([{
          listing_id: p.listing_id,
          buyer_id: user.id,
          quantity,
          offered_price: offeredPrice,
          subtotal,
          platform_fee_percent: fee_percent,
          platform_fee_amount: fee_amount,
          total_amount: total,
        }]).select("id").single();
        if (error) throw error;
        result = { order_id: order.id, total_usd: total };
      }
      else if (action.action_type === "accept_bid") {
        if (!p.bid_id) throw new Error("bid_id required");
        // Verify the bid belongs to the user's delivery request
        const { data: bid } = await supabase
          .from("delivery_bids")
          .select("id, request_id, driver_id, bid_price, status, delivery_requests!inner(buyer_id, status)")
          .eq("id", p.bid_id)
          .eq("delivery_requests.buyer_id", user.id)
          .maybeSingle();
        if (!bid) throw new Error("Bid not found or unauthorized");
        if (bid.status !== "pending") throw new Error("Bid already accepted or rejected");
        // RLS already enforces visibility; we do an update with a status guard
        const { data: assignedRequest, error: drErr } = await supabase
          .from("delivery_requests")
          .update({ status: "assigned", assigned_driver_id: bid.driver_id, agreed_price: bid.bid_price })
          .eq("id", bid.request_id)
          .eq("status", "open")
          .select("id")
          .maybeSingle();
        if (drErr) throw drErr;
        if (!assignedRequest) throw new Error("Delivery request is no longer open");

        const { data: acceptedBid, error: bidErr } = await supabase
          .from("delivery_bids")
          .update({ status: "accepted" })
          .eq("id", p.bid_id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();
        if (bidErr) throw bidErr;
        if (!acceptedBid) {
          await supabase
            .from("delivery_requests")
            .update({ status: "open", assigned_driver_id: null, agreed_price: null })
            .eq("id", bid.request_id)
            .eq("assigned_driver_id", bid.driver_id);
          throw new Error("Bid is no longer available");
        }
        result = { delivery_request_id: bid.request_id, driver_id: bid.driver_id };
      }
      else if (action.action_type === "create_delivery_request") {
        if (!p.order_id || !p.pickup_province || !p.dropoff_province || !p.cargo_type || !p.cargo_quantity) {
          throw new Error("Missing delivery fields");
        }
        const { data: order } = await supabase
          .from("orders")
          .select("id, buyer_id, status, listing_id, listings(farmer_id)")
          .eq("id", p.order_id).maybeSingle();
        if (!order) throw new Error("Order not found");
        if (order.buyer_id !== user.id) throw new Error("Only the buyer can create a delivery request");
        if (!["confirmed", "ready_for_delivery"].includes(order.status)) {
          throw new Error("Delivery can only be requested for a confirmed order");
        }
        const { data: dr, error } = await supabase.from("delivery_requests").insert([{
          order_id: p.order_id,
          buyer_id: user.id,
          seller_id: (order.listings as any)?.farmer_id,
          pickup_province: p.pickup_province,
          pickup_town: p.pickup_town || null,
          dropoff_province: p.dropoff_province,
          dropoff_town: p.dropoff_town || null,
          cargo_type: p.cargo_type,
          cargo_quantity: String(p.cargo_quantity),
          cargo_weight: p.cargo_weight || null,
          special_instructions: p.special_instructions || null,
        }]).select("id").single();
        if (error) throw error;
        result = { delivery_request_id: dr.id };
      }
      else if (action.action_type === "topup_intent") {
        // Just records intent — the actual top-up requires manual proof submission
        result = {
          message: "Top-up intent noted. Please go to Wallet → Top Up to submit your payment proof.",
          amount_usd: p.amount_usd,
          method: p.method,
          link: "/wallet",
        };
      }
      else {
        throw new Error(`Unknown action_type: ${action.action_type}`);
      }

      await supabase.from("ai_pending_actions").update({
        status: "executed", result, executed_at: new Date().toISOString(),
      }).eq("id", action.id);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (execErr) {
      const msg = execErr instanceof Error ? execErr.message : "Execution failed";
      await supabase.from("ai_pending_actions").update({
        status: "failed", result: { error: msg }, executed_at: new Date().toISOString(),
      }).eq("id", action.id);
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
