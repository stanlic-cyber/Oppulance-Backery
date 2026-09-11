import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getServiceClient, getAuthedUser } from "../_shared/auth.ts";

interface ModerationFlag { code: string; reason: string }

serve(async (req) => {
  const pre = handlePreflight(req); if (pre) return pre;

  try {
    const authed = await getAuthedUser(req);
    if (!authed) return errorResponse("Unauthorized", 401, req);

    const { listing_id } = await req.json();
    if (!listing_id) return errorResponse("listing_id required", 400, req);

    const svc = getServiceClient();
    const { data: listing, error: lErr } = await svc
      .from("listings")
      .select("id, farmer_id, title, description, photos")
      .eq("id", listing_id)
      .maybeSingle();
    if (lErr || !listing) return errorResponse("Listing not found", 404, req);
    if (listing.farmer_id !== authed.userId) return errorResponse("Forbidden", 403, req);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const flags: ModerationFlag[] = [];
    let confidence = 1;
    let status: "approved" | "flagged" | "rejected" = "approved";

    if (apiKey && (listing.photos?.length || listing.title)) {
      const userContent: any[] = [
        { type: "text", text: `Moderate this farm marketplace listing for Murimi Connect (Zimbabwe). Title: "${listing.title}". Description: "${listing.description ?? ""}".\nReturn STRICT JSON: {"status":"approved|flagged|rejected","confidence":0..1,"flags":[{"code":"nsfw|violence|spam|misleading|off_topic|low_quality","reason":"..."}]}\nApprove genuine produce/livestock/farm equipment listings. Flag anything unrelated, sexual, violent, scam-like, or spam.` },
      ];
      for (const url of (listing.photos ?? []).slice(0, 4)) {
        userContent.push({ type: "image_url", image_url: { url } });
      }

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are an image and text moderation engine. Reply with JSON only." },
            { role: "user", content: userContent },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content ?? "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            status = parsed.status ?? "approved";
            confidence = parsed.confidence ?? 0.8;
            if (Array.isArray(parsed.flags)) flags.push(...parsed.flags);
          } catch (_) { /* ignore parse */ }
        }
      } else {
        console.error("AI moderation failed", await res.text());
      }
    }

    // Upsert moderation row
    await svc.from("listing_moderation").delete().eq("listing_id", listing_id);
    await svc.from("listing_moderation").insert([{
      listing_id, status, confidence, flags,
      notes: flags.map(f => f.reason).join("; ") || null,
    }]);

    // Auto-hide if rejected
    if (status === "rejected") {
      await svc.from("listings").update({ status: "draft" }).eq("id", listing_id);
    }

    return jsonResponse({ status, confidence, flags }, 200, {}, req);
  } catch (e) {
    console.error("Moderation error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500, req);
  }
});
