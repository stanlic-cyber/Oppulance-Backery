import { useState } from 'react';
import { Loader2, ArrowUpRight } from 'lucide-react';
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
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { sendTxEmail } from '@/lib/email';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  availableBalance: number;
  onSubmitted: () => void;
}

export const WithdrawDialog = ({ open, onOpenChange, availableBalance, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [method, setMethod] = useState<'ecocash' | 'bank'>('ecocash');
  const [amount, setAmount] = useState('');
  const [ecoNumber, setEcoNumber] = useState('');
  const [ecoName, setEcoName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAcctName, setBankAcctName] = useState('');
  const [bankAcctNumber, setBankAcctNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setAmount('');
    setEcoNumber('');
    setEcoName('');
    setBankName('');
    setBankAcctName('');
    setBankAcctNumber('');
    setBankBranch('');
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 5) {
      toast.error('Enter at least $5.00');
      return;
    }
    if (amt > availableBalance) {
      toast.error('Amount exceeds your available balance');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: amt,
        p_method: method,
        p_ecocash_number: method === 'ecocash' ? ecoNumber.trim() : null,
        p_ecocash_name: method === 'ecocash' ? ecoName.trim() : null,
        p_bank_name: method === 'bank' ? bankName.trim() : null,
        p_bank_account_name: method === 'bank' ? bankAcctName.trim() : null,
        p_bank_account_number: method === 'bank' ? bankAcctNumber.trim() : null,
        p_bank_branch: method === 'bank' ? bankBranch.trim() || null : null,
      } as any);
      if (error) throw error;

      toast.success('Withdrawal requested. We\'ll process it within 24h.');
      // Best-effort confirmation email
      if (user?.email) {
        sendTxEmail(user.email, 'withdrawal_requested', { amount: amt.toFixed(2) });
      }
      reset();
      onSubmitted();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to request withdrawal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            Withdraw funds
          </DialogTitle>
          <DialogDescription>
            Available: <span className="font-semibold text-foreground">${availableBalance.toFixed(2)}</span>.
            Min $5, max $10,000 per request. Processed within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              min="5"
              step="0.01"
              max={availableBalance}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block">Payout method</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="grid grid-cols-2 gap-2">
              <Label className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${method==='ecocash' ? 'border-primary bg-primary/5' : ''}`}>
                <RadioGroupItem value="ecocash" />
                <span>EcoCash</span>
              </Label>
              <Label className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${method==='bank' ? 'border-primary bg-primary/5' : ''}`}>
                <RadioGroupItem value="bank" />
                <span>Bank transfer</span>
              </Label>
            </RadioGroup>
          </div>

          {method === 'ecocash' ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="econum">EcoCash number</Label>
                <Input id="econum" placeholder="0772 000 000" value={ecoNumber} onChange={(e) => setEcoNumber(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="econame">Account name</Label>
                <Input id="econame" placeholder="As registered with EcoCash" value={ecoName} onChange={(e) => setEcoName(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="bn">Bank name</Label>
                <Input id="bn" placeholder="e.g. CABS" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ban">Account name</Label>
                <Input id="ban" value={bankAcctName} onChange={(e) => setBankAcctName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="banum">Account number</Label>
                <Input id="banum" value={bankAcctNumber} onChange={(e) => setBankAcctNumber(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bbr">Branch (optional)</Label>
                <Input id="bbr" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            The amount is held from your wallet immediately. If we reject the request, the funds are returned to your wallet automatically.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Request withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
