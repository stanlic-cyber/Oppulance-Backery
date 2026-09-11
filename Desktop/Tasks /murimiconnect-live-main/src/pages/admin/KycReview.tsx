import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldX, Loader2, RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KycRow {
  id: string;
  user_id: string;
  submission_type: 'seller' | 'driver';
  id_number: string | null;
  id_photo_url: string | null;
  selfie_url: string | null;
  licence_url: string | null;
  vehicle_reg_url: string | null;
  vehicle_plate: string | null;
  status: string;
  created_at: string;
  rejection_reason: string | null;
}

const KycReview = () => {
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejecting, setRejecting] = useState<KycRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data || []) as KycRow[]);
    setLoading(false);

    // Sign URLs for preview
    const sigs: Record<string, string> = {};
    for (const r of data || []) {
      for (const key of ['id_photo_url', 'selfie_url', 'licence_url', 'vehicle_reg_url'] as const) {
        const path = (r as any)[key] as string | null;
        if (!path) continue;
        const { data: s } = await supabase.storage.from('kyc-documents').createSignedUrl(path, 600);
        if (s?.signedUrl) sigs[path] = s.signedUrl;
      }
    }
    setSigned(sigs);
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (row: KycRow) => {
    setBusy(true);
    try {
      const { error } = await supabase.from('kyc_submissions')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), rejection_reason: null })
        .eq('id', row.id);
      if (error) throw error;

      if (row.submission_type === 'seller') {
        await supabase.from('profiles').update({ kyc_status: 'approved' }).eq('id', row.user_id);
      } else {
        await supabase.from('driver_profiles').update({ kyc_status: 'approved' }).eq('user_id', row.user_id);
      }
      toast.success('Approved');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!rejecting || !reason.trim()) return toast.error('Please give a reason');
    setBusy(true);
    try {
      const { error } = await supabase.from('kyc_submissions')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason.trim() })
        .eq('id', rejecting.id);
      if (error) throw error;

      if (rejecting.submission_type === 'seller') {
        await supabase.from('profiles').update({ kyc_status: 'rejected' }).eq('id', rejecting.user_id);
      } else {
        await supabase.from('driver_profiles').update({ kyc_status: 'rejected' }).eq('user_id', rejecting.user_id);
      }
      toast.success('Rejected');
      setRejecting(null);
      setReason('');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  return (
    <AdminLayout title="KYC Review">
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">KYC Review</h1>
          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected'] as const).map(s => (
              <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
                {s}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">No {filter} submissions</div>
        ) : (
          <div className="grid gap-4">
            {rows.map(r => (
              <div key={r.id} className="bg-card rounded-2xl p-5 shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={r.submission_type === 'driver' ? 'default' : 'secondary'}>{r.submission_type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-sm font-mono">User: {r.user_id.slice(0, 8)}...</div>
                    <div className="text-sm">ID: {r.id_number}</div>
                    {r.vehicle_plate && <div className="text-sm">Plate: {r.vehicle_plate}</div>}
                  </div>
                  {filter === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={() => approve(r)} disabled={busy}>
                        <ShieldCheck className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejecting(r)} disabled={busy}>
                        <ShieldX className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['id_photo_url', 'selfie_url', 'licence_url', 'vehicle_reg_url'] as const).map(k => {
                    const path = (r as any)[k];
                    if (!path) return null;
                    const url = signed[path];
                    return (
                      <a key={k} href={url} target="_blank" rel="noreferrer" className="block">
                        <div className="text-xs text-muted-foreground mb-1 capitalize">{k.replace('_url', '').replace('_', ' ')}</div>
                        {url ? <img src={url} alt={k} className="w-full h-32 object-cover rounded-lg border" /> : <div className="h-32 bg-muted rounded-lg" />}
                      </a>
                    );
                  })}
                </div>
                {r.rejection_reason && (
                  <div className="mt-3 text-sm text-destructive">Reason: {r.rejection_reason}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject submission</DialogTitle></DialogHeader>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why (visible to user)" rows={4} />
            <Button onClick={reject} variant="destructive" disabled={busy}>Confirm rejection</Button>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default KycReview;
