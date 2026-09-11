import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RaiseDisputeDialog = ({ orderId, open, onOpenChange, onSuccess }: Props) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('raise_dispute', {
        p_order_id: orderId,
        p_reason: reason.trim(),
        p_details: details.trim() || null,
        p_evidence_urls: [],
      } as any);
      if (error) throw error;
      toast.success('Dispute raised. An admin will review shortly.');
      onOpenChange(false);
      setReason('');
      setDetails('');
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to raise dispute');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise a dispute</DialogTitle>
          <DialogDescription>
            Funds in escrow will be frozen pending admin review. Provide as much detail as possible.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g. Item not as described"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={120}
            />
          </div>
          <div>
            <Label htmlFor="details">Details (optional)</Label>
            <Textarea
              id="details"
              placeholder="What happened? When? Any evidence?"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Raise dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
