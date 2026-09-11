import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend_api_key = Deno.env.get("RESEND_API_KEY");
const from_email = Deno.env.get("RESEND_FROM_EMAIL") || "Murimi Connect <onboarding@resend.dev>";

// Sanitize user input to prevent XSS in HTML emails
function sanitizeHtml(input: string | undefined | null): string {
  if (!input) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

async function sendEmail(to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resend_api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from_email,
      to,
      subject,
      html,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to send email");
  }
  
  return response.json();
}

interface NotificationRequest {
  type: "new_order" | "new_message" | "offer" | "counter_offer" | "accept" | "reject";
  order_id: string;
  sender_id: string;
  recipient_id: string;
  listing_title: string;
  message_text?: string;
  offered_price?: number;
}

const getEmailSubject = (type: string, listingTitle: string): string => {
  switch (type) {
    case "new_order":
      return `New Order for ${listingTitle} - Murimi Connect`;
    case "new_message":
      return `New Message about ${listingTitle} - Murimi Connect`;
    case "offer":
      return `New Offer for ${listingTitle} - Murimi Connect`;
    case "counter_offer":
      return `Counter Offer for ${listingTitle} - Murimi Connect`;
    case "accept":
      return `Offer Accepted for ${listingTitle} - Murimi Connect`;
    case "reject":
      return `Offer Rejected for ${listingTitle} - Murimi Connect`;
    default:
      return `Update on ${listingTitle} - Murimi Connect`;
  }
};

const getEmailHtml = (
  type: string,
  senderName: string,
  listingTitle: string,
  messageText?: string,
  offeredPrice?: number
): string => {
  // Sanitize all user-provided inputs to prevent XSS
  const safeSenderName = sanitizeHtml(senderName);
  const safeListingTitle = sanitizeHtml(listingTitle);
  const safeMessageText = sanitizeHtml(messageText);
  const safePrice = offeredPrice?.toFixed(2) || "0.00";
  
  let actionText = "";
  
  switch (type) {
    case "new_order":
      actionText = `<strong>${safeSenderName}</strong> has placed a new order for your listing <strong>${safeListingTitle}</strong>.`;
      break;
    case "new_message":
      actionText = `<strong>${safeSenderName}</strong> sent you a message about <strong>${safeListingTitle}</strong>.`;
      break;
    case "offer":
      actionText = `<strong>${safeSenderName}</strong> made an offer of <strong>$${safePrice}</strong> for <strong>${safeListingTitle}</strong>.`;
      break;
    case "counter_offer":
      actionText = `<strong>${safeSenderName}</strong> made a counter offer of <strong>$${safePrice}</strong> for <strong>${safeListingTitle}</strong>.`;
      break;
    case "accept":
      actionText = `Great news! <strong>${safeSenderName}</strong> has accepted your offer for <strong>${safeListingTitle}</strong>.`;
      break;
    case "reject":
      actionText = `<strong>${safeSenderName}</strong> has declined the offer for <strong>${safeListingTitle}</strong>.`;
      break;
    default:
      actionText = `You have a new update about <strong>${safeListingTitle}</strong>.`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Murimi Connect Notification</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🌾 Murimi Connect</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Farm-to-Table Marketplace</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
            ${actionText}
          </p>
          
          ${safeMessageText ? `
            <div style="background-color: #f8f9fa; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #555; font-style: italic;">"${safeMessageText}"</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://829b9b94-e227-4c2b-9eba-bd72fd695d64.lovable.app/my-orders" 
               style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Order Details
            </a>
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            You're receiving this because you're a member of Murimi Connect.<br>
            © 2024 Murimi Connect. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate authentication - CRITICAL SECURITY CHECK
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user's auth token to verify identity
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user's token using getUser()
    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error("Authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const authenticatedUserId = userData.user.id;
    console.log("Authenticated user:", authenticatedUserId);

    const { type, order_id, sender_id, recipient_id, listing_title, message_text, offered_price }: NotificationRequest = await req.json();

    // 2. Verify sender_id matches authenticated user - CRITICAL SECURITY CHECK
    if (sender_id !== authenticatedUserId) {
      console.error("Sender ID mismatch - potential spoofing attempt:", { sender_id, authenticatedUserId });
      return new Response(
        JSON.stringify({ error: 'Sender ID does not match authenticated user' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify business relationship - user must be a participant in the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('buyer_id, listing_id, listings(farmer_id)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found or access denied:", orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is participant in this order (buyer or seller)
    const isBuyer = order.buyer_id === authenticatedUserId;
    const isSeller = (order.listings as any)?.farmer_id === authenticatedUserId;

    if (!isBuyer && !isSeller) {
      console.error("User not authorized for this order:", { authenticatedUserId, order });
      return new Response(
        JSON.stringify({ error: 'Not authorized for this order' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verify recipient is the other party in the transaction
    const expectedRecipient = isBuyer ? (order.listings as any)?.farmer_id : order.buyer_id;
    if (recipient_id !== expectedRecipient) {
      console.error("Invalid recipient - not a party to this order:", { recipient_id, expectedRecipient });
      return new Response(
        JSON.stringify({ error: 'Invalid recipient for this order' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending notification email:", { type, order_id, recipient_id, sender: authenticatedUserId });

    // Get sender's profile name
    const { data: senderProfile, error: senderError } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", sender_id)
      .maybeSingle();

    if (senderError) {
      console.error("Error fetching sender profile:", senderError);
    }

    // Get recipient's email from profile
    const { data: recipientProfile, error: recipientError } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", recipient_id)
      .maybeSingle();

    if (recipientError || !recipientProfile?.email) {
      console.error("Error fetching recipient profile:", recipientError);
      return new Response(
        JSON.stringify({ error: "Recipient email not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY: do NOT trust caller-supplied listing_title. Fetch from DB.
    const { data: listingRow } = await supabase
      .from("listings")
      .select("title")
      .eq("id", (order as any).listing_id)
      .maybeSingle();
    const verifiedListingTitle = listingRow?.title || "your listing";

    const senderName = senderProfile?.name || "A user";
    const subject = getEmailSubject(type, verifiedListingTitle);
    const html = getEmailHtml(type, senderName, verifiedListingTitle, message_text, offered_price);

    const emailData = await sendEmail([recipientProfile.email], subject, html);

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    // Log full error details server-side for debugging
    console.error("Error in send-notification-email:", error);
    
    // Map errors to safe, generic messages to prevent information leakage
    let userMessage = 'Failed to send notification';
    const errorMsg = error.message?.toLowerCase() || '';
    
    if (errorMsg.includes('email') || errorMsg.includes('resend')) {
      userMessage = 'Email delivery failed';
    } else if (errorMsg.includes('not found') || errorMsg.includes('recipient')) {
      userMessage = 'Recipient not found';
    } else if (errorMsg.includes('unauthorized') || errorMsg.includes('auth')) {
      userMessage = 'Authentication failed';
    }
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
