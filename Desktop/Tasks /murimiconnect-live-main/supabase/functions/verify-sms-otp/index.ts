import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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

    const { code } = await req.json();
    if (!code || !/^\d{6}$/.test(String(code))) {
      return json({ error: 'Enter the 6-digit code' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: rows } = await admin
      .from('phone_otps')
      .select('*')
      .eq('user_id', user.id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) return json({ error: 'No active code. Request a new one.' }, 400);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: 'Code expired. Request a new one.' }, 400);
    }
    if (row.attempts >= 5) {
      return json({ error: 'Too many attempts. Request a new code.' }, 429);
    }

    const hash = await sha256(String(code));
    if (hash !== row.code_hash) {
      await admin.from('phone_otps').update({ attempts: row.attempts + 1 }).eq('id', row.id);
      return json({ error: 'Incorrect code' }, 400);
    }

    const consumedAt = new Date().toISOString();
    const { data: consumedRows, error: consumeError } = await admin
      .from('phone_otps')
      .update({ consumed_at: consumedAt })
      .eq('id', row.id);
      .is('consumed_at', null)
      .select('id');
    if (consumeError) {
      console.error('OTP consume error', consumeError);
      return json({ error: 'Could not verify code' }, 500);
    }
    if (!consumedRows?.length) {
      return json({ error: 'Code has already been used. Request a new one.' }, 400);
    }

    const { error: profileError } = await admin.from('profiles').update({
      phone: row.phone,
      phone_verified_at: consumedAt,
    }).eq('id', user.id);
    if (profileError) {
      console.error('Phone verification profile update error', profileError);
      return json({ error: 'Could not update phone verification' }, 500);
    }

    return json({ ok: true, phone: row.phone });
  } catch (e) {
    console.error('SMS OTP verification failed', e);
    return json({ error: 'Could not verify code' }, 500);
  }
});
