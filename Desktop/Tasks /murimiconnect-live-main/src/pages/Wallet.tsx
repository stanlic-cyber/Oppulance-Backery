import { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, Lock, Plus, RefreshCw, Wallet as WalletIcon, Shield, Banknote } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { TopUpDialog } from '@/components/wallet/TopUpDialog';
import { WithdrawDialog } from '@/components/wallet/WithdrawDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const entryMeta: Record<string, { label: string; icon: any; color: string }> = {
  topup: { label: 'Top-up', icon: ArrowDownLeft, color: 'text-green-600' },
  escrow_lock: { label: 'Escrow held', icon: Lock, color: 'text-amber-600' },
  escrow_release: { label: 'Escrow released', icon: ArrowDownLeft, color: 'text-green-600' },
  escrow_refund: { label: 'Refund', icon: ArrowDownLeft, color: 'text-blue-600' },
  withdrawal_hold: { label: 'Withdrawal pending', icon: ArrowUpRight, color: 'text-amber-600' },
  withdrawal_paid: { label: 'Withdrawal paid', icon: Banknote, color: 'text-foreground' },
  withdrawal_reversed: { label: 'Withdrawal returned', icon: ArrowDownLeft, color: 'text-blue-600' },
  fee_deduction: { label: 'Platform fee', icon: ArrowUpRight, color: 'text-destructive' },
  adjustment: { label: 'Adjustment', icon: ArrowUpRight, color: 'text-muted-foreground' },
};

const WalletPage = () => {
  const { user } = useAuth();
  const { wallet, ledger, loading, refresh } = useWallet();
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

  const loadPending = async () => {
    if (!user) return;
    const [{ data: tops }, { data: wds }] = await Promise.all([
      supabase.from('wallet_topup_requests').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('wallet_withdrawal_requests').select('*').eq('user_id', user.id).in('status', ['pending']).order('created_at', { ascending: false }),
    ]);
    setPendingTopups(tops ?? []);
    setPendingWithdrawals(wds ?? []);
  };

  useEffect(() => { loadPending(); }, [user, ledger]);

  const cancelWithdrawal = async (id: string) => {
    const { error } = await supabase.rpc('cancel_withdrawal', { p_id: id } as any);
    if (error) toast.error(error.message);
    else { toast.success('Withdrawal cancelled — funds returned'); refresh(); loadPending(); }
  };

  return (
    <Layout>
      <PageHeader title="My Wallet" backTo="/" />

      <div className="container max-w-2xl py-4 md:py-6 space-y-4 pb-24">
        {/* Balance card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5 opacity-90" />
                <span className="text-sm font-medium opacity-90">Murimi Wallet</span>
              </div>
              {wallet?.frozen && (
                <Badge variant="secondary" className="bg-destructive text-destructive-foreground">
                  <Lock className="h-3 w-3 mr-1" />
                  Frozen
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs opacity-75 mb-1">Available balance</p>
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <p className="text-4xl font-bold tracking-tight">
                  ${(wallet?.balance_usd ?? 0).toFixed(2)}
                </p>
              )}
              <p className="text-xs opacity-75 mt-1">USD</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-6">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-xl"
                onClick={() => setTopupOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Top up
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="rounded-xl"
                disabled={(wallet?.balance_usd ?? 0) < 5}
                onClick={() => setWithdrawOpen(true)}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
              <Button size="sm" variant="ghost" className="col-span-2 rounded-xl text-primary-foreground hover:bg-white/10" onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trust banner */}
        <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-0.5">Funds protected by escrow</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              When you place an order, your funds are held safely until you confirm delivery.
              If something goes wrong, you can raise a dispute.
            </p>
          </div>
        </div>

        {/* Pending top-ups */}
        {pendingTopups.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium">Pending top-ups</p>
              {pendingTopups.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">${Number(t.amount_usd).toFixed(2)} via {t.method}</p>
                    <p className="text-xs text-muted-foreground">Ref: {t.payment_reference}</p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">Awaiting review</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending withdrawals */}
        {pendingWithdrawals.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Pending withdrawals</p>
              {pendingWithdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">${Number(w.amount_usd).toFixed(2)} via {w.method}</p>
                    <p className="text-xs text-muted-foreground">Processed within 24h</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => cancelWithdrawal(w.id)}>
                    Cancel
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Ledger */}
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <p className="text-sm font-medium">Recent activity</p>
            </div>
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
            ) : ledger.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No activity yet. Top up to get started.
              </div>
            ) : (
              <ul className="divide-y">
                {ledger.map((e) => {
                  const meta = entryMeta[e.entry_type];
                  const Icon = meta?.icon ?? ArrowUpRight;
                  const positive = e.amount_usd > 0;
                  return (
                    <li key={e.id} className="flex items-center gap-3 p-4">
                      <div className={`h-9 w-9 rounded-full bg-muted flex items-center justify-center ${meta?.color ?? ''}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{meta?.label ?? e.entry_type}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {e.description ?? new Date(e.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${positive ? 'text-green-600' : 'text-foreground'}`}>
                          {positive ? '+' : ''}${Math.abs(e.amount_usd).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">${e.balance_after.toFixed(2)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} onSubmitted={() => { refresh(); loadPending(); }} />
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        availableBalance={wallet?.balance_usd ?? 0}
        onSubmitted={() => { refresh(); loadPending(); }}
      />
    </Layout>
  );
};

export default WalletPage;
