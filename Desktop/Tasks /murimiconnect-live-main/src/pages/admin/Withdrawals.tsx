import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Banknote, Smartphone } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendTxEmail } from '@/lib/email';

type Withdrawal = {
  id: string;
  user_id: string;
  amount_usd: number;
  method: 'ecocash' | 'bank';
  ecocash_number: string | null;
  ecocash_name: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  admin_notes: string | null;
  created_at: string;
  paid_at: string | null;
};

const AdminWithdrawals = () => {
  const [list, setList] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string | null }>>({});
  const [tab, setTab] = useState<'pending' | 'paid' | 'rejected' | 'cancelled'>('pending');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Withdrawal | null>(null);
  const [action, setAction] = useState<'paid' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wallet_withdrawal_requests')
      .select('*')
      .eq('status', tab)
      .order('created_at', { ascending: false })
      .limit(100);
    const items = (data as Withdrawal[]) ?? [];
    setList(items);

    const ids = [...new Set(items.map((i) => i.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', ids);
      const m: Record<string, { name: string; email: string | null }> = {};
      (profs ?? []).forEach((p: any) => (m[p.id] = { name: p.name, email: p.email }));
      setProfiles(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const submit = async () => {
    if (!active || !action) return;
    if (action === 'reject' && notes.trim().length < 3) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setBusy(true);
    try {
      const fn = action === 'paid' ? 'mark_withdrawal_paid' : 'reject_withdrawal';
      const { error } = await supabase.rpc(fn, {
        p_id: active.id,
        p_admin_notes: notes || null,
      } as any);
      if (error) throw error;

      toast.success(action === 'paid' ? 'Marked as paid' : 'Withdrawal rejected');

      // Email the user
      const email = profiles[active.user_id]?.email;
      if (email) {
        if (action === 'paid') {
          sendTxEmail(email, 'withdrawal_paid', {
            amount: Number(active.amount_usd).toFixed(2),
            method: active.method,
          });
        } else {
          sendTxEmail(email, 'withdrawal_rejected', {
            reason: notes || 'No reason provided',
          });
        }
      }

      setActive(null);
      setAction(null);
      setNotes('');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="Withdrawals">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : list.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No {tab} withdrawals.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {list.map((w) => {
                const u = profiles[w.user_id];
                return (
                  <Card key={w.id}>
                    <CardContent className="p-4 flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-lg">${Number(w.amount_usd).toFixed(2)}</p>
                          <Badge variant="outline" className="capitalize">
                            {w.method === 'ecocash' ? <Smartphone className="h-3 w-3 mr-1" /> : <Banknote className="h-3 w-3 mr-1" />}
                            {w.method}
                          </Badge>
                          {w.status === 'paid' && <Badge className="bg-green-600">Paid</Badge>}
                          {w.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                          {w.status === 'cancelled' && <Badge variant="secondary">Cancelled</Badge>}
                        </div>
                        <p className="text-sm">
                          {u?.name ?? w.user_id.slice(0, 8)}{' '}
                          <span className="text-muted-foreground">· {u?.email}</span>
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                          {w.method === 'ecocash' ? (
                            <>
                              <p>EcoCash: <span className="font-mono text-foreground">{w.ecocash_number}</span></p>
                              <p>Name: <span className="text-foreground">{w.ecocash_name}</span></p>
                            </>
                          ) : (
                            <>
                              <p>{w.bank_name} — <span className="font-mono text-foreground">{w.bank_account_number}</span></p>
                              <p>Name: <span className="text-foreground">{w.bank_account_name}</span> {w.bank_branch ? `· ${w.bank_branch}` : ''}</p>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested {new Date(w.created_at).toLocaleString()}
                          {w.paid_at && <> · Paid {new Date(w.paid_at).toLocaleString()}</>}
                        </p>
                        {w.admin_notes && <p className="text-xs italic text-muted-foreground mt-1">Note: {w.admin_notes}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {w.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => { setActive(w); setAction('paid'); setNotes(''); }}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark paid
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setActive(w); setAction('reject'); setNotes(''); }}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!active} onOpenChange={(o) => !o && !busy && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'paid' ? 'Mark withdrawal paid' : 'Reject withdrawal'}</DialogTitle>
            <DialogDescription>
              {action === 'paid'
                ? 'Confirm only after you have actually sent the funds via the payout method below.'
                : 'The held funds will be returned to the user\'s wallet immediately.'}
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>${Number(active.amount_usd).toFixed(2)}</strong> via {active.method}
              </p>
              <Textarea
                placeholder={action === 'reject' ? 'Reason (required)' : 'Internal notes (optional)'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={busy || (action === 'reject' && notes.trim().length < 3)}
              variant={action === 'reject' ? 'destructive' : 'default'}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {action === 'paid' ? 'Confirm paid' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminWithdrawals;
