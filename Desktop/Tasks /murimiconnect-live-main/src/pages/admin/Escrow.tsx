import { useEffect, useState } from 'react';
import { Loader2, Lock, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Hold = {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount_usd: number;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  locked_at: string;
};

type Dispute = {
  id: string;
  escrow_hold_id: string;
  raised_by: string;
  reason: string;
  details: string | null;
  status: 'open' | 'resolved_release' | 'resolved_refund' | 'cancelled';
  created_at: string;
};

const AdminEscrow = () => {
  const [tab, setTab] = useState<'held' | 'disputed' | 'released' | 'refunded'>('held');
  const [holds, setHolds] = useState<Hold[]>([]);
  const [disputes, setDisputes] = useState<Record<string, Dispute>>({});
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<{ dispute: Dispute; outcome: 'release' | 'refund' } | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('escrow_holds')
      .select('*')
      .eq('status', tab)
      .order('locked_at', { ascending: false })
      .limit(100);
    const items = (data as Hold[]) ?? [];
    setHolds(items);

    if (tab === 'disputed') {
      const ids = items.map((i) => i.id);
      if (ids.length) {
        const { data: ds } = await supabase
          .from('escrow_disputes')
          .select('*')
          .in('escrow_hold_id', ids)
          .eq('status', 'open');
        const m: Record<string, Dispute> = {};
        (ds ?? []).forEach((d: any) => (m[d.escrow_hold_id] = d));
        setDisputes(m);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tab]);

  const resolve = async () => {
    if (!resolving) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('resolve_dispute', {
        p_dispute_id: resolving.dispute.id,
        p_outcome: resolving.outcome,
        p_admin_notes: notes || null,
      } as any);
      if (error) throw error;
      toast.success(`Dispute resolved: ${resolving.outcome}`);
      setResolving(null);
      setNotes('');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const adminRefund = async (h: Hold) => {
    if (!confirm(`Refund $${h.amount_usd} to buyer?`)) return;
    const { error } = await supabase.rpc('escrow_refund', {
      p_order_id: h.order_id,
      p_reason: 'Admin refund',
    } as any);
    if (error) toast.error(error.message);
    else { toast.success('Refunded'); load(); }
  };

  const adminRelease = async (h: Hold) => {
    if (!confirm(`Release $${h.amount_usd} to seller?`)) return;
    const { error } = await supabase.rpc('escrow_release', {
      p_order_id: h.order_id,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success('Released'); load(); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { c: string; label: string }> = {
      held: { c: 'bg-amber-500', label: 'Held' },
      released: { c: 'bg-green-600', label: 'Released' },
      refunded: { c: 'bg-blue-600', label: 'Refunded' },
      disputed: { c: 'bg-destructive', label: 'Disputed' },
    };
    const m = map[s];
    return <Badge className={m.c}>{m.label}</Badge>;
  };

  return (
    <AdminLayout title="Escrow & Disputes">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="held"><Lock className="h-3.5 w-3.5 mr-1" /> Held</TabsTrigger>
          <TabsTrigger value="disputed"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Disputed</TabsTrigger>
          <TabsTrigger value="released">Released</TabsTrigger>
          <TabsTrigger value="refunded">Refunded</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : holds.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nothing here.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {holds.map((h) => {
                const d = disputes[h.id];
                return (
                  <Card key={h.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-lg">${Number(h.amount_usd).toFixed(2)}</p>
                            {statusBadge(h.status)}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">Order: {h.order_id.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">Buyer: {h.buyer_id.slice(0, 8)}... → Seller: {h.seller_id.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">Locked: {new Date(h.locked_at).toLocaleString()}</p>
                          {d && (
                            <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                              <p className="font-medium">Dispute: {d.reason}</p>
                              {d.details && <p className="text-xs text-muted-foreground">{d.details}</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {h.status === 'held' && (
                            <>
                              <Button size="sm" onClick={() => adminRelease(h)}><Check className="h-3.5 w-3.5 mr-1" /> Release</Button>
                              <Button size="sm" variant="outline" onClick={() => adminRefund(h)}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Refund</Button>
                            </>
                          )}
                          {h.status === 'disputed' && d && (
                            <>
                              <Button size="sm" onClick={() => setResolving({ dispute: d, outcome: 'release' })}>
                                Resolve → Seller
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setResolving({ dispute: d, outcome: 'refund' })}>
                                Resolve → Buyer
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve dispute</DialogTitle>
          </DialogHeader>
          {resolving && (
            <div className="space-y-3 text-sm">
              <p>
                Outcome: <strong>{resolving.outcome === 'release' ? 'Release funds to seller' : 'Refund to buyer'}</strong>
              </p>
              <Textarea
                placeholder="Resolution notes (recommended)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)} disabled={busy}>Cancel</Button>
            <Button onClick={resolve} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEscrow;
