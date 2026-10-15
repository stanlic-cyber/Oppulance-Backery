import { useState } from 'react';
import { Loader2, Upload, Copy, Check } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

type Method = 'ecocash' | 'onemoney' | 'bank';

export const TopUpDialog = ({ open, onOpenChange, onSubmitted }: TopUpDialogProps) => {
  const { user } = useAuth();
  const [method, setMethod] = useState<Method>('ecocash');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Lazy-load admin payment details when dialog opens
  const loadPaymentDetails = async () => {
    if (paymentDetails) return;
    const { data } = await supabase.from('platform_payment_settings').select('*').limit(1).maybeSingle();
    setPaymentDetails(data);
  };

  if (open && !paymentDetails) loadPaymentDetails();

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const reset = () => {
    setAmount('');
    setReference('');
    setFile(null);
  };

  const submit = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!reference.trim()) {
      toast.error('Enter the payment reference / transaction ID');
      return;
    }

    setSubmitting(true);
    try {
      let proofUrl: string | null = null;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('topup-proofs')
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        proofUrl = path; // store path; signed URL on read
      }

      const { error } = await supabase.from('wallet_topup_requests').insert({
        user_id: user.id,
        amount_usd: amt,
        method,
        payment_reference: reference.trim(),
        proof_url: proofUrl,
        status: 'pending',
      });
      if (error) throw error;

      toast.success('Top-up request submitted. An admin will verify shortly.');
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? 'Failed to submit top-up');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Top up your wallet</DialogTitle>
          <DialogDescription>
            Pay using one of the methods below, then submit your reference and proof.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Payment method</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)} className="grid grid-cols-3 gap-2">
              {(['ecocash', 'onemoney', 'bank'] as Method[]).map((m) => (
                <Label
                  key={m}
                  htmlFor={`m-${m}`}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 cursor-pointer text-sm capitalize ${
                    method === m ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <RadioGroupItem value={m} id={`m-${m}`} className="sr-only" />
                  {m === 'onemoney' ? 'OneMoney' : m}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {paymentDetails && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <p className="font-medium text-foreground">Send payment to:</p>
              {method === 'ecocash' && paymentDetails.ecocash_number && (
                <>
                  <Row label="Number" value={paymentDetails.ecocash_number} onCopy={(v) => copy(v, 'ec-num')} copied={copied === 'ec-num'} />
                  <Row label="Name" value={paymentDetails.ecocash_name ?? '—'} />
                </>
              )}
              {method === 'onemoney' && paymentDetails.ecocash_number && (
                <>
                  <Row label="Number" value={paymentDetails.ecocash_number} onCopy={(v) => copy(v, 'om-num')} copied={copied === 'om-num'} />
                  <Row label="Name" value={paymentDetails.ecocash_name ?? '—'} />
                </>
              )}
              {method === 'bank' && (
                <>
                  <Row label="Bank" value={paymentDetails.bank_name ?? '—'} />
                  <Row label="Account name" value={paymentDetails.bank_account_name ?? '—'} />
                  <Row label="Account #" value={paymentDetails.bank_account_number ?? '—'} onCopy={(v) => copy(v, 'b-acc')} copied={copied === 'b-acc'} />
                  <Row label="Branch" value={paymentDetails.bank_branch ?? '—'} />
                </>
              )}
            </div>
          )}

          <div className="grid gap-3">
            <div>
              <Label htmlFor="amt">Amount (USD)</Label>
              <Input id="amt" type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50.00" />
            </div>
            <div>
              <Label htmlFor="ref">Payment reference / Transaction ID</Label>
              <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. EC123456789" />
            </div>
            <div>
              <Label htmlFor="proof">Proof of payment (screenshot)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="proof"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
                {file && <Upload className="h-4 w-4 text-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Optional but speeds up verification.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: (v: string) => void; copied?: boolean }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-muted-foreground text-xs">{label}</span>
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-sm">{value}</span>
      {onCopy && (
        <button onClick={() => onCopy(value)} className="text-primary hover:opacity-70" aria-label={`Copy ${label}`}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  </div>
);
