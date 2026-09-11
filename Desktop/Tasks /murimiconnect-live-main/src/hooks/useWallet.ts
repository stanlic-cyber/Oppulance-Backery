import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WalletLedgerEntry = {
  id: string;
  entry_type: 'topup' | 'escrow_lock' | 'escrow_release' | 'escrow_refund' | 'fee_deduction' | 'adjustment';
  amount_usd: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
};

export type Wallet = {
  id: string;
  user_id: string;
  balance_usd: number;
  frozen: boolean;
};

/**
 * useWallet — single source of truth for the user's wallet.
 * - Auto-creates a wallet on first read via the ensure-on-credit pattern (server side)
 * - Subscribes to realtime changes on the user's wallet row
 */
export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setLedger([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: w }, { data: l }] = await Promise.all([
        supabase.from('user_wallets').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('wallet_ledger')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setWallet((w as Wallet) ?? { id: '', user_id: user.id, balance_usd: 0, frozen: false });
      setLedger((l as WalletLedgerEntry[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_wallets', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_ledger', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { wallet, ledger, loading, refresh };
}
