// @ts-expect-error Supabase Edge Functions resolve Deno HTTPS imports at runtime.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-expect-error Supabase Edge Functions resolve Deno HTTPS imports at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { errorResponse, handlePreflight, jsonResponse } from "../_shared/cors.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Murimi Connect <onboarding@resend.dev>";

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

interface OtpEmailRequest {
  recipient_email: string;
  recipient_name: string;
  otp_code: string;
  amount_due: number;
  user_type: string;
}

const getEmailHtml = (
  recipientName: string,
  otpCode: string,
  amountDue: number,
  userType: string
): string => {
  const safeRecipientName = sanitizeHtml(recipientName);
  const safeOtp = sanitizeHtml(otpCode);
  const safeAmount = amountDue.toFixed(2);
  const safeUserType = sanitizeHtml(userType);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code - Murimi Connect</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🌾 Murimi Connect</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Platform Fee Payment Verified</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
            Hello <strong>${safeRecipientName}</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
            Great news! Your platform fee payment of <strong>USD ${safeAmount}</strong> for your ${safeUserType} account has been verified.
          </p>

          <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
            Use the following OTP code to unlock your account:
          </p>
          
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #16a34a; padding: 24px; margin: 24px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 500;">Your One-Time Password</p>
            <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #15803d; font-family: monospace;">
              ${safeOtp}
            </p>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⚠️ Important:</strong> This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://829b9b94-e227-4c2b-9eba-bd72fd695d64.lovable.app" 
               style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Open Murimi Connect
            </a>
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            You're receiving this because your payment was verified by our admin team.<br>
            © 2024 Murimi Connect. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY secret");
      return errorResponse("Email service is not configured", 503, req);
    }

    // Validate authentication - only admins can send OTP emails
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse("Missing authorization", 401, req);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's auth token to verify identity
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user's token
    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !userData?.user) {
      return errorResponse("Unauthorized", 401, req);
    }
    
    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await userSupabase
      .rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
    
    if (roleError || !isAdmin) {
      return errorResponse("Only admins can send OTP emails", 403, req);
    }

    const { recipient_email, recipient_name, otp_code, amount_due, user_type }: OtpEmailRequest = await req.json();

    if (
      !recipient_email ||
      !recipient_name ||
      !otp_code ||
      typeof amount_due !== "number" ||
      !Number.isFinite(amount_due) ||
      !user_type
    ) {
      return errorResponse("Missing required fields", 400, req);
    }

    console.log("Sending OTP email to:", recipient_email);

    const subject = "Your OTP Code - Murimi Connect Platform Fee Verified";
    const html = getEmailHtml(recipient_name, otp_code, amount_due, user_type);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient_email],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error("Resend API error:", error);
      throw new Error(error.message || "Failed to send email");
    }

    const emailData = await emailResponse.json();
    console.log("OTP email sent successfully:", emailData);

    return jsonResponse({ success: true, emailId: emailData?.id }, 200, {}, req);
  } catch (error: any) {
    console.error("Error in send-otp-email:", error);
    
    return errorResponse("Failed to send OTP email", 500, req);
  }
};

serve(handler);
