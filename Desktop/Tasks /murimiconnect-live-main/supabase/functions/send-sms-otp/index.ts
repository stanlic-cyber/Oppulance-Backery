import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(raw: string): string | null {
  const s = (raw || '').replace(/\s|-/g, '');
  if (/^\+\d{8,15}$/.test(s)) return s;
  // Zimbabwe local format like 0771234567 -> +263771234567
  if (/^0\d{9}$/.test(s)) return '+263' + s.slice(1);
  return null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { phone } = await req.json();
    const e164 = normalizePhone(phone);
    if (!e164) return json({ error: 'Invalid phone number. Use +263... or 077...' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    const FROM = Deno.env.get('TWILIO_FROM_NUMBER');
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
      return json({ error: 'SMS service not configured' }, 503);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limit: max 3 OTPs per 10 minutes per user
    const { count: userCount } = await admin
      .from('phone_otps')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString());
    if ((userCount ?? 0) >= 3) {
      return json({ error: 'Too many requests. Please wait a few minutes.' }, 429);
    }

    const codeArray = new Uint8Array(3);
    crypto.getRandomValues(codeArray);
    const code = String(100000 + (codeArray[0] * 256 * 256 + codeArray[1] * 256 + codeArray[2]) % 900000);
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insErr } = await admin.from('phone_otps').insert([{
      user_id: user.id, phone: e164, code_hash, expires_at,
    }]);
    if (insErr) {
      console.error('OTP insert error', insErr);
      return json({ error: 'Could not create verification code' }, 500);
    }

    const twilioRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: e164,
        From: FROM,
        Body: `Murimi Connect: your verification code is ${code}. Expires in 10 minutes.`,
      }),
    });
    const twilioBody = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error('SMS provider error', twilioRes.status);
      return json({ error: 'Failed to send SMS' }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    console.error('SMS OTP request failed', e);
    return json({ error: 'Could not send verification code' }, 500);
  }
});
