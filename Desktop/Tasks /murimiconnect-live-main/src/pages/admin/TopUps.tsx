import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ExternalLink, FileText } from 'lucide-react';
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
import { sendTxEmail } from '@/lib/email';

type TopUp = {
  id: string;
  user_id: string;
  amount_usd: number;
  method: string;
  payment_reference: string;
  proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const AdminTopUps = () => {
  const [list, setList] = useState<TopUp[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string | null }>>({});
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TopUp | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wallet_topup_requests')
      .select('*')
      .eq('status', tab)
      .order('created_at', { ascending: false })
      .limit(100);
    const items = (data as TopUp[]) ?? [];
    setList(items);

    // Profiles
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

  useEffect(() => {
    load();
  }, [tab]);

  const viewProof = async (t: TopUp) => {
    if (!t.proof_url) return;
    if (proofUrls[t.id]) {
      window.open(proofUrls[t.id], '_blank');
      return;
    }
    const { data } = await supabase.storage.from('topup-proofs').createSignedUrl(t.proof_url, 300);
    if (data?.signedUrl) {
      setProofUrls((p) => ({ ...p, [t.id]: data.signedUrl }));
      window.open(data.signedUrl, '_blank');
    }
  };

  const submit = async () => {
    if (!active || !action) return;
    setBusy(true);
    try {
      const fn = action === 'approve' ? 'approve_topup' : 'reject_topup';
      const { error } = await supabase.rpc(fn, {
        p_topup_id: active.id,
        p_admin_notes: notes || null,
      } as any);
      if (error) throw error;

      // Best-effort email to the user
      const email = profiles[active.user_id]?.email;
      if (email) {
        if (action === 'approve') {
          sendTxEmail(email, 'topup_approved', { amount: Number(active.amount_usd).toFixed(2) });
        } else {
          sendTxEmail(email, 'topup_rejected', { reason: notes || 'No reason provided' });
        }
      }

      toast.success(`Top-up ${action}d`);
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
    <AdminLayout title="Wallet Top-ups">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : list.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No {tab} top-ups.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {list.map((t) => {
                const u = profiles[t.user_id];
                return (
                  <Card key={t.id}>
                    <CardContent className="p-4 flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">${Number(t.amount_usd).toFixed(2)}</p>
                          <Badge variant="outline" className="capitalize">{t.method}</Badge>
                          {t.status === 'approved' && <Badge className="bg-green-600">Approved</Badge>}
                          {t.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                        </div>
                        <p className="text-sm">{u?.name ?? t.user_id.slice(0, 8)} <span className="text-muted-foreground">· {u?.email}</span></p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: <span className="font-mono">{t.payment_reference}</span> · {new Date(t.created_at).toLocaleString()}
                        </p>
                        {t.admin_notes && <p className="text-xs italic text-muted-foreground mt-1">Note: {t.admin_notes}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {t.proof_url && (
                          <Button size="sm" variant="outline" onClick={() => viewProof(t)}>
                            <FileText className="h-3.5 w-3.5 mr-1" /> Proof <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                        {t.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => { setActive(t); setAction('approve'); }}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setActive(t); setAction('reject'); }}>
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

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'approve' ? 'Approve top-up' : 'Reject top-up'}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>${Number(active.amount_usd).toFixed(2)}</strong> via {active.method} · ref{' '}
                <span className="font-mono">{active.payment_reference}</span>
              </p>
              {action === 'approve' && (
                <p className="text-muted-foreground">This will credit the user's wallet immediately.</p>
              )}
              <Textarea
                placeholder={action === 'reject' ? 'Reason (required)' : 'Notes (optional)'}
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
              disabled={busy || (action === 'reject' && !notes.trim())}
              variant={action === 'reject' ? 'destructive' : 'default'}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm {action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTopUps;
