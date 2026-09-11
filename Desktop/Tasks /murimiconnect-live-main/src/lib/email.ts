import { supabase } from '@/integrations/supabase/client';

type Template =
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

/**
 * Fire-and-forget transactional email. Never throws — failures are logged only.
 * Use whenever a meaningful state change happens that the user should hear about.
 */
export async function sendTxEmail(
  to: string | null | undefined,
  template: Template,
  data?: Record<string, string | number | undefined | null>,
) {
  if (!to) return;
  try {
    await supabase.functions.invoke('send-transactional-email', {
      body: { to, template, data },
    });
  } catch (err) {
    // Never block the UI flow because of email
    console.warn('[email] send failed', template, err);
  }
}

/** Resolve a user's email from profiles (for sending counterparty emails) */
export async function getUserEmail(userId: string): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  return data?.email ?? null;
}
