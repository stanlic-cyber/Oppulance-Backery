import { useState } from 'react';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConfirmActionCardProps {
  pendingId: string;
  onResolved?: (status: 'executed' | 'cancelled' | 'failed', result?: any) => void;
}

type ActionRow = {
  id: string;
  action_type: string;
  payload: any;
  status: string;
  expires_at: string;
};

export const ConfirmActionCard = ({ pendingId, onResolved }: ConfirmActionCardProps) => {
  const [action, setAction] = useState<ActionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<'executed' | 'cancelled' | 'failed' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lazy load
  if (!action && !resolved) {
    supabase.from('ai_pending_actions').select('*').eq('id', pendingId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAction(data as any);
          if (data.status !== 'pending') setResolved(data.status as any);
        }
      });
  }

  if (!action) {
    return (
      <div className="mt-2 rounded-xl border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
        Loading action…
      </div>
    );
  }

  const expired = new Date(action.expires_at) < new Date();
  const finalStatus = resolved || (action.status !== 'pending' ? action.status : null);

  if (finalStatus === 'executed') {
    return (
      <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-xs flex items-center gap-2">
        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-foreground">Confirmed and completed.</span>
      </div>
    );
  }
  if (finalStatus === 'cancelled') {
    return (
      <div className="mt-2 rounded-xl border border-border bg-muted/40 p-2.5 text-xs flex items-center gap-2">
        <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground">Cancelled.</span>
      </div>
    );
  }
  if (finalStatus === 'failed' || finalStatus === 'expired' || expired) {
    return (
      <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
        <span className="text-foreground">{errorMsg || (expired ? 'Expired — ask again.' : 'Action failed.')}</span>
      </div>
    );
  }

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-execute-action', {
        body: { pending_action_id: pendingId },
      });
      if (error || !data?.success) {
        const msg = data?.error || error?.message || 'Action failed';
        setErrorMsg(msg);
        setResolved('failed');
        onResolved?.('failed');
        toast.error(msg);
      } else {
        setResolved('executed');
        onResolved?.('executed', data.result);
        toast.success('Done!');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    await supabase.from('ai_pending_actions').update({ status: 'cancelled' }).eq('id', pendingId);
    setResolved('cancelled');
    onResolved?.('cancelled');
    setBusy(false);
  };

  const labels: Record<string, string> = {
    place_order: 'Place order',
    accept_bid: 'Accept driver bid',
    create_delivery_request: 'Create delivery request',
    topup_intent: 'Start wallet top-up',
  };

  return (
    <div className="mt-2 rounded-xl border-2 border-primary/30 bg-card p-3 text-xs space-y-2">
      <div className="font-semibold text-foreground">{labels[action.action_type] || action.action_type}</div>
      <div className="rounded-lg bg-muted/50 p-2 text-[11px] font-mono text-muted-foreground max-h-24 overflow-y-auto">
        {Object.entries(action.payload || {}).map(([k, v]) => (
          <div key={k}><span className="text-foreground">{k}:</span> {String(v)}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleConfirm} disabled={busy}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Confirm</>}
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={handleCancel} disabled={busy}>
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );
};
