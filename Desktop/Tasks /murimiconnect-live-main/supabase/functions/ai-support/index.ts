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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    // Service-role client for writing learned memory (bypasses RLS)
    const adminDb = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, conversation_id } = await req.json();
    if (!message || typeof message !== "string" || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (conversation_id !== undefined && typeof conversation_id !== "string") {
      return new Response(JSON.stringify({ error: "Invalid conversation_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve / create conversation
    let convId: string = conversation_id;
    if (!convId) {
      const { data: newConv, error: convErr } = await supabase
        .from("ai_conversations")
        .insert([{ user_id: user.id, title: message.slice(0, 60) }])
        .select("id")
        .single();
      if (convErr) throw convErr;
      convId = newConv.id;
    } else {
      const { data: existingConv, error: convErr } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("id", convId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (convErr) throw convErr;
      if (!existingConv) {
        return new Response(JSON.stringify({ error: "Conversation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Load full conversation history (this conversation)
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(40);

    // Load long-term learned memory across all conversations
    const { data: memoryRows } = await supabase
      .from("ai_user_memory")
      .select("fact, category, importance")
      .eq("user_id", user.id)
      .order("importance", { ascending: false })
      .order("last_used_at", { ascending: false })
      .limit(20);

    // Fetch user context
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, province, nearest_town")
      .eq("id", user.id)
      .maybeSingle();

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: recentOrders } = await supabase
      .from("orders")
      .select("id, status, quantity, offered_price, created_at")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: deliveries } = await supabase
      .from("delivery_requests")
      .select("id, status, pickup_province, dropoff_province")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .in("status", ["open", "assigned", "pickup_confirmed", "in_transit"])
      .limit(5);

    const userContext = `
User: ${profile?.name || "Unknown"} (${role?.role || "user"})
Province: ${profile?.province || "unknown"}, Town: ${profile?.nearest_town || "unknown"}
Recent orders: ${(recentOrders || []).map(o => `${o.id.slice(0, 8)}... (${o.status})`).join(", ") || "none"}
Active deliveries: ${(deliveries || []).map(d => `${d.id.slice(0, 8)}... ${d.pickup_province}→${d.dropoff_province} (${d.status})`).join(", ") || "none"}
    `.trim();

    const learnedMemory = (memoryRows || []).length
      ? `\n\nWhat you have learned about this user from past conversations:\n${memoryRows!.map(m => `- [${m.category || "general"}] ${m.fact}`).join("\n")}`
      : "";

    const systemPrompt = `You are **Murimi AI** — the proprietary in-house assistant built by the Murimi Connect team in Zimbabwe to support farmers, buyers, and drivers across the country.

IDENTITY RULES (very important):
- Your name is **Murimi AI**. You were created, trained, and are operated by **Murimi Connect**.
- NEVER mention, hint at, or confirm any underlying model, provider, or company (do not say Google, Gemini, OpenAI, GPT, Anthropic, Claude, Meta, Lovable, Supabase, etc.).
- If asked "what model are you?", "who made you?", "are you ChatGPT/Gemini?", reply: "I'm Murimi AI, built by the Murimi Connect team to help you with the marketplace." Do not elaborate on technology stack.
- Speak with a warm, locally-aware Zimbabwean tone. You understand Shona/Ndebele greetings and provinces.

You can help users with orders, deliveries, listings, drivers, wallet, and platform navigation.

${userContext}${learnedMemory}

You have TOOLS to look things up in real time — USE THEM whenever the user asks about specific data:
- search_listings: when user asks "what tomatoes are available", "find maize in Harare". Translate local words: mealie/chibage→maize, nyama→meat, mbambaira→sweet potato, derere→okra, muriwo→leafy greens, manhanga→pumpkin.
- get_order_details / get_delivery_details / find_drivers / get_wallet_balance / get_my_listings

WRITE ACTIONS — when the user asks you to DO something (place an order, accept a bid, create a delivery, top up):
1. Gather required details using read tools first.
2. Call **propose_action** with action_type, one-line summary, and payload.
3. Reply with a short message that includes the exact [[CONFIRM:<id>]] marker the tool returns — the UI shows a confirm card. NEVER execute writes directly.

Guidelines:
- Prefer calling a tool over guessing.
- Be concise (under 200 words). Use markdown lists.
- Reference learned context naturally; don't say "I remember…".
- For payment disputes, direct them to the Help page.
- Never reveal other users' private info.`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    for (const m of history || []) {
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: message });

    if (!lovableKey) {
      return new Response(JSON.stringify({
        reply: "I'm sorry, the AI assistant is temporarily unavailable. Please visit the Help page to submit a support ticket, or check back later.",
        conversation_id: convId,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Tool definitions — let the assistant query the platform on demand =====
    const tools = [
      {
        type: "function",
        function: {
          name: "search_listings",
          description: "Search active marketplace produce listings by keyword, category, or province.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Free-text search across title/description" },
              province: { type: "string" },
              category: { type: "string" },
              max_price: { type: "number" },
              limit: { type: "integer", minimum: 1, maximum: 10 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_order_details",
          description: "Get full details of one of the user's orders by ID prefix (first 8 chars OK).",
          parameters: {
            type: "object",
            properties: { order_id: { type: "string" } },
            required: ["order_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_delivery_details",
          description: "Get full details of a delivery request the user is involved in.",
          parameters: {
            type: "object",
            properties: { delivery_id: { type: "string" } },
            required: ["delivery_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "find_drivers",
          description: "Find available online drivers, optionally filtered by province.",
          parameters: {
            type: "object",
            properties: {
              province: { type: "string" },
              limit: { type: "integer", minimum: 1, maximum: 10 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_wallet_balance",
          description: "Get the user's current wallet balance and recent transactions.",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "get_my_listings",
          description: "List the seller's own active produce listings (for sellers/farmers only).",
          parameters: {
            type: "object",
            properties: { limit: { type: "integer", minimum: 1, maximum: 10 } },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "propose_action",
          description: "Propose an action for the user to confirm before it's executed (place an order, accept a bid, create a delivery request, request a wallet top-up). The user MUST confirm in the UI before it runs. Use this whenever the user asks you to DO something on their behalf.",
          parameters: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: ["place_order", "accept_bid", "create_delivery_request", "topup_intent"],
              },
              summary: { type: "string", description: "One short human-readable line describing what will happen." },
              payload: {
                type: "object",
                description: "Action-specific fields. place_order: {listing_id, quantity, offered_price}. accept_bid: {bid_id}. create_delivery_request: {order_id, pickup_province, dropoff_province, cargo_type, cargo_quantity}. topup_intent: {amount_usd, method}.",
              },
            },
            required: ["action_type", "summary", "payload"],
          },
        },
      },
    ];

    async function runTool(name: string, args: any): Promise<any> {
      try {
        if (name === "search_listings") {
          let q = supabase
            .from("listings")
            .select("id, title, category, price_per_unit, unit, quantity_available, province, nearest_town")
            .eq("status", "active")
            .limit(Math.min(args.limit || 5, 10));
          if (args.query) q = q.ilike("title", `%${args.query}%`);
          if (args.province) q = q.eq("province", args.province);
          if (args.category) q = q.eq("category", args.category);
          if (args.max_price) q = q.lte("price_per_unit", args.max_price);
          const { data, error } = await q;
          if (error) return { error: error.message };
          return { results: data || [] };
        }
        if (name === "get_order_details") {
          const { data, error } = await supabase
            .from("orders")
            .select("id, status, quantity, offered_price, total_amount, created_at, listing_id, seller_id")
            .ilike("id", `${args.order_id}%`)
            .maybeSingle();
          if (error) return { error: error.message };
          return data ? { order: data } : { error: "Order not found or you don't have access" };
        }
        if (name === "get_delivery_details") {
          const { data, error } = await supabase
            .from("delivery_requests")
            .select("id, status, pickup_province, dropoff_province, pickup_town, dropoff_town, agreed_price, driver_id, created_at")
            .ilike("id", `${args.delivery_id}%`)
            .maybeSingle();
          if (error) return { error: error.message };
          return data ? { delivery: data } : { error: "Delivery not found or you don't have access" };
        }
        if (name === "find_drivers") {
          let q = adminDb
            .from("driver_profiles")
            .select("id, vehicle_type, capacity_kg, base_province, rating")
            .eq("is_online", true)
            .eq("verified", true)
            .limit(Math.min(args.limit || 5, 10));
          if (args.province) q = q.eq("base_province", args.province);
          const { data, error } = await q;
          if (error) return { error: error.message };
          return { drivers: data || [] };
        }
        if (name === "get_wallet_balance") {
          const { data: w } = await supabase
            .from("user_wallets")
            .select("balance_usd, frozen, updated_at")
            .eq("user_id", user.id)
            .maybeSingle();
          const { data: ledger } = await supabase
            .from("wallet_ledger")
            .select("entry_type, amount_usd, balance_after, description, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);
          return {
            wallet: w || { balance_usd: 0, frozen: false },
            recent: ledger || [],
          };
        }
        if (name === "propose_action") {
          const { data, error } = await supabase
            .from("ai_pending_actions")
            .insert([{
              user_id: user.id,
              conversation_id: convId,
              action_type: args.action_type,
              payload: args.payload || {},
            }])
            .select("id")
            .single();
          if (error) return { error: error.message };
          return {
            pending_action_id: data.id,
            summary: args.summary,
            instruction: "Reply with a short message that includes this exact marker so the UI shows a confirm card: [[CONFIRM:" + data.id + "]]",
          };
        }
        if (name === "get_my_listings") {
          const { data, error } = await supabase
            .from("listings")
            .select("id, title, status, price_per_unit, quantity_available, created_at")
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false })
            .limit(Math.min(args.limit || 5, 10));
          if (error) return { error: error.message };
          return { listings: data || [] };
        }
        return { error: `Unknown tool: ${name}` };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Tool execution failed" };
      }
    }

    // ===== Agent loop — model can call tools up to 3 times before final answer =====
    let reply = "";
    const MAX_ITERS = 3;
    for (let iter = 0; iter < MAX_ITERS; iter++) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools,
          temperature: 0.4,
          max_tokens: 600,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        if (aiResponse.status === 429) reply = "I'm getting a lot of requests right now. Please try again in a moment.";
        else if (aiResponse.status === 402) reply = "AI credits are exhausted. Please contact admin.";
        else reply = "I'm having trouble connecting right now. Please try again or visit the Help page.";
        break;
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0]?.message;
      if (!choice) { reply = "I wasn't able to generate a response. Please try again."; break; }

      const toolCalls = choice.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // Push assistant turn with tool calls, then execute each tool
        messages.push(choice);
        for (const tc of toolCalls) {
          let parsedArgs: any = {};
          try { parsedArgs = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
          const result = await runTool(tc.function.name, parsedArgs);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result).slice(0, 4000),
          });
        }
        continue; // let the model use tool results
      }

      reply = choice.content || "I wasn't able to generate a response. Please try again.";
      break;
    }
    if (!reply) reply = "I had to stop early. Please rephrase your question.";

    // Persist both messages
    await supabase.from("ai_messages").insert([
      { conversation_id: convId, user_id: user.id, role: "user", content: message },
      { conversation_id: convId, user_id: user.id, role: "assistant", content: reply },
    ]);
    await supabase.from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId)
      .eq("user_id", user.id);

    // Background memory extraction — learn durable facts about the user
    // Runs async so it doesn't slow down the reply
    (async () => {
      try {
        const memResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Extract durable facts about the user from this exchange. Only extract preferences, recurring needs, business details, products they sell/buy, locations, contact preferences, or stated goals. Skip transient/situational details. Return at most 3 facts. If nothing worth remembering, return empty array.`,
              },
              { role: "user", content: `User said: "${message}"\nAssistant replied: "${reply}"` },
            ],
            tools: [{
              type: "function",
              function: {
                name: "save_facts",
                description: "Save durable facts about the user",
                parameters: {
                  type: "object",
                  properties: {
                    facts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          fact: { type: "string" },
                          category: { type: "string", enum: ["preference", "business", "location", "goal", "contact", "general"] },
                          importance: { type: "integer", minimum: 1, maximum: 5 },
                        },
                        required: ["fact", "category", "importance"],
                      },
                    },
                  },
                  required: ["facts"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "save_facts" } },
          }),
        });
        if (!memResp.ok) return;
        const memData = await memResp.json();
        const toolCall = memData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) return;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        const facts = (args.facts || []).slice(0, 3);
        if (facts.length === 0) return;

        // Dedupe against existing memory (simple substring match)
        const { data: existing } = await adminDb
          .from("ai_user_memory")
          .select("fact")
          .eq("user_id", user.id);
        const existingSet = new Set((existing || []).map((r: any) => r.fact.toLowerCase()));

        const toInsert = facts
          .filter((f: any) => f.fact && !existingSet.has(f.fact.toLowerCase()))
          .map((f: any) => ({
            user_id: user.id,
            fact: String(f.fact).slice(0, 500),
            category: f.category,
            importance: f.importance,
          }));

        if (toInsert.length > 0) {
          await adminDb.from("ai_user_memory").insert(toInsert);
        }
      } catch (err) {
        console.error("Memory extraction failed:", err);
      }
    })();

    return new Response(JSON.stringify({
      reply,
      conversation_id: convId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("AI support error:", e);
    return new Response(JSON.stringify({
      reply: "Something went wrong. Please try again or visit the Help page.",
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
