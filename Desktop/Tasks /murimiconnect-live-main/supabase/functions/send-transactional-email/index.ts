// Transactional email dispatcher — uses Resend via the Lovable connector gateway.
// Called from the app on key events: order placed/confirmed/completed,
// escrow released, top-up approved/rejected, withdrawal events, dispute raised.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from "../_shared/cors.ts";

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
const FROM = Deno.env.get('RESEND_FROM_EMAIL') || 'Mukurutown <onboarding@resend.dev>';

type TemplateName =
  | 'order_placed_buyer'
  | 'order_placed_seller'
  | 'order_confirmed'
  | 'order_completed'
  | 'order_cancelled'
  | 'escrow_released'
  | 'topup_approved'
  | 'topup_rejected'
  | 'withdrawal_requested'
  | 'withdrawal_paid'
  | 'withdrawal_rejected'
  | 'dispute_raised'
  | 'account_locked';

interface Payload {
  to: string;
  template: TemplateName;
  data?: Record<string, string | number | undefined>;
}

// ---- escape helper (prevents HTML injection in user-supplied fields) ----
const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const wrap = (title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string) => `
<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#16A34A;padding:20px 24px;color:#fff">
      <div style="font-size:18px;font-weight:700">Mukurutown</div>
    </div>
    <div style="padding:24px">
      <h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>
      <div style="font-size:15px;line-height:1.55;color:#334155">${bodyHtml}</div>
      ${
        ctaUrl
          ? `<div style="margin-top:24px"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#16A34A;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${esc(ctaLabel || 'Open app')}</a></div>`
          : ''
      }
      <p style="margin-top:32px;font-size:12px;color:#64748b">You're receiving this because you have an account with Mukurutown.</p>
    </div>
  </div>
</body></html>
`;

function render(template: TemplateName, d: Record<string, any> = {}): { subject: string; html: string } {
  const appUrl = Deno.env.get('APP_PUBLIC_URL') || 'https://mukurutown.lovable.app';
  switch (template) {
    case 'order_placed_buyer':
      return {
        subject: `Order placed — $${esc(d.amount)} held in escrow`,
        html: wrap(
          'Your order is placed',
          `<p>We've placed your order for <b>${esc(d.listingTitle)}</b> and locked <b>$${esc(d.amount)}</b> in escrow.</p>
           <p>The seller will be notified now. You'll only release the funds once you confirm delivery.</p>`,
          `${appUrl}/my-orders`,
          'View order',
        ),
      };
    case 'order_placed_seller':
      return {
        subject: `New order — ${esc(d.listingTitle)}`,
        html: wrap(
          'You have a new order',
          `<p>A buyer placed an order for <b>${esc(d.listingTitle)}</b> totaling <b>$${esc(d.amount)}</b>.</p>
           <p>The funds are locked in escrow. Accept the order to proceed.</p>`,
          `${appUrl}/seller`,
          'Open dashboard',
        ),
      };
    case 'order_confirmed':
      return {
        subject: `Order confirmed`,
        html: wrap('Order confirmed', `<p>Your order <b>${esc(d.orderId)}</b> has been confirmed. You can now message the other party freely.</p>`, `${appUrl}/my-orders`, 'View order'),
      };
    case 'order_completed':
      return {
        subject: `Order complete — escrow released`,
        html: wrap('Order complete', `<p>Funds of <b>$${esc(d.amount)}</b> have been released to the seller's wallet.</p>`, `${appUrl}/wallet`, 'View wallet'),
      };
    case 'order_cancelled':
      return {
        subject: `Order cancelled`,
        html: wrap('Order cancelled', `<p>Order <b>${esc(d.orderId)}</b> was cancelled. Any escrow held has been refunded to the buyer's wallet.</p>`, `${appUrl}/my-orders`, 'View orders'),
      };
    case 'escrow_released':
      return {
        subject: `You received $${esc(d.amount)}`,
        html: wrap('Funds released', `<p><b>$${esc(d.amount)}</b> from order ${esc(d.orderId)} is now available in your wallet.</p>`, `${appUrl}/wallet`, 'Open wallet'),
      };
    case 'topup_approved':
      return {
        subject: `Top-up approved — $${esc(d.amount)} added`,
        html: wrap('Top-up approved', `<p>We've added <b>$${esc(d.amount)}</b> to your wallet. You're ready to transact.</p>`, `${appUrl}/wallet`, 'View wallet'),
      };
    case 'topup_rejected':
      return {
        subject: `Top-up could not be verified`,
        html: wrap('Top-up rejected', `<p>We could not verify your top-up.</p><p><b>Reason:</b> ${esc(d.reason || 'Please re-submit with a clearer proof of payment.')}</p>`, `${appUrl}/wallet`, 'Try again'),
      };
    case 'withdrawal_requested':
      return {
        subject: `Withdrawal request received — $${esc(d.amount)}`,
        html: wrap('Withdrawal pending', `<p>We've received your request to withdraw <b>$${esc(d.amount)}</b>. We'll review and process it within 24 hours.</p>`, `${appUrl}/wallet`, 'View wallet'),
      };
    case 'withdrawal_paid':
      return {
        subject: `Withdrawal paid — $${esc(d.amount)}`,
        html: wrap('Withdrawal paid', `<p>We've sent <b>$${esc(d.amount)}</b> to your <b>${esc(d.method)}</b> account. Please confirm receipt and reach out if anything looks off.</p>`, `${appUrl}/wallet`, 'View wallet'),
      };
    case 'withdrawal_rejected':
      return {
        subject: `Withdrawal request rejected`,
        html: wrap('Withdrawal rejected', `<p>Your withdrawal request was rejected and the funds returned to your wallet.</p><p><b>Reason:</b> ${esc(d.reason)}</p>`, `${appUrl}/wallet`, 'View wallet'),
      };
    case 'dispute_raised':
      return {
        subject: `Dispute opened on order ${esc(d.orderId)}`,
        html: wrap('Dispute opened', `<p>A dispute was raised on order <b>${esc(d.orderId)}</b>. Our admin team will review and reach out shortly.</p>`, `${appUrl}/my-orders`, 'View order'),
      };
    case 'account_locked':
      return {
        subject: `Action required: account locked`,
        html: wrap('Account locked', `<p>Your account has been temporarily locked because of an unpaid platform fee balance of <b>$${esc(d.balance)}</b>.</p><p>Settle the balance to unlock all features.</p>`, `${appUrl}/settings`, 'Settle balance'),
      };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // AuthN: cron-only. This function sends platform-branded transactional emails
    // with caller-supplied data — we do not allow regular user JWTs to invoke it,
    // to prevent phishing via arbitrary recipients/amounts. Server-side callers
    // (other edge functions, cron) must present the shared CRON_SECRET.
    const cronProvided = req.headers.get('x-cron-secret');
    const cronExpected = Deno.env.get('CRON_SECRET');
    if (!cronExpected || cronProvided !== cronExpected) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body?.to || !body?.template) {
      return new Response(JSON.stringify({ error: 'to and template are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
      return new Response(JSON.stringify({ error: 'invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort: skip if user is suppressed (we don't have suppression table — quietly skip in future)

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error('Missing LOVABLE_API_KEY or RESEND_API_KEY');
      return new Response(JSON.stringify({ error: 'email not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subject, html } = render(body.template, body.data || {});

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({ from: FROM, to: [body.to], subject, html }),
    });

    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('Resend error', resp.status, result);
      return new Response(JSON.stringify({ error: 'send failed', detail: result }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: result?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-transactional-email error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
