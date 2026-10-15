import { useState } from 'react';
import { Loader2, DollarSign, ArrowRight, Check, HandshakeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HireRequest {
  id: string;
  buyer_id: string;
  driver_id: string;
  pickup_location: string;
  dropoff_location: string;
  buyer_offer_amount?: number;
  driver_counter_amount?: number;
  final_agreed_amount?: number;
  currency?: string;
  negotiation_status?: string;
  status: string;
}

interface HireNegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: HireRequest;
  userRole: 'buyer' | 'driver';
  onSuccess?: () => void;
}

const HireNegotiationDialog = ({ 
  open, 
  onOpenChange, 
  request, 
  userRole,
  onSuccess 
}: HireNegotiationDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');

  const handleSubmitOffer = async () => {
    if (!user || !amount) {
      toast.error('Please enter an amount');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      if (userRole === 'buyer') {
        // Buyer submitting or updating offer
        const { error } = await supabase
          .from('driver_hire_requests')
          .update({
            buyer_offer_amount: numAmount,
            negotiation_status: 'open',
          })
          .eq('id', request.id);

        if (error) throw error;
        toast.success('Offer submitted!');
      } else {
        // Driver countering
        const { error } = await supabase
          .from('driver_hire_requests')
          .update({
            driver_counter_amount: numAmount,
            negotiation_status: 'countered',
          })
          .eq('id', request.id);

        if (error) throw error;
        toast.success('Counter offer sent!');
      }

      onOpenChange(false);
      setAmount('');
      onSuccess?.();
    } catch (err: any) {
      console.error('Error submitting offer:', err);
      toast.error(err.message || 'Failed to submit offer');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    setLoading(true);
    try {
      const agreedAmount = userRole === 'buyer' 
        ? request.driver_counter_amount 
        : request.buyer_offer_amount;

      const { error } = await supabase
        .from('driver_hire_requests')
        .update({
          final_agreed_amount: agreedAmount,
          negotiation_status: 'agreed',
        })
        .eq('id', request.id);

      if (error) throw error;
      toast.success('Price agreed! 🎉');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error accepting offer:', err);
      toast.error(err.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  const getNegotiationStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Open</Badge>;
      case 'countered':
        return <Badge className="bg-amber-500 hover:bg-amber-500">Countered</Badge>;
      case 'agreed':
        return <Badge className="bg-green-500 hover:bg-green-500">Agreed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">No Offer</Badge>;
    }
  };

  const canBuyerAct = userRole === 'buyer' && (
    !request.negotiation_status || 
    request.negotiation_status === 'open' || 
    request.negotiation_status === 'countered'
  );

  const canDriverAct = userRole === 'driver' && (
    request.negotiation_status === 'open' && request.buyer_offer_amount
  );

  const showAcceptButton = (
    (userRole === 'buyer' && request.negotiation_status === 'countered' && request.driver_counter_amount) ||
    (userRole === 'driver' && request.negotiation_status === 'open' && request.buyer_offer_amount)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandshakeIcon className="h-5 w-5 text-primary" />
            Price Negotiation
          </DialogTitle>
          <DialogDescription className="text-xs truncate">
            {request.pickup_location} → {request.dropoff_location}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Status</span>
            {getNegotiationStatusBadge(request.negotiation_status)}
          </div>

          {/* Offer Summary */}
          <div className="space-y-2">
            {request.buyer_offer_amount && (
              <div className="flex items-center justify-between p-3.5 border rounded-xl bg-card">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm">Buyer's Offer</span>
                </div>
                <span className="font-bold text-lg">
                  ${request.buyer_offer_amount.toFixed(2)}
                </span>
              </div>
            )}

            {request.driver_counter_amount && (
              <div className="flex items-center justify-between p-3.5 border-2 border-amber-200 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-sm">Driver's Counter</span>
                </div>
                <span className="font-bold text-lg text-amber-600">
                  ${request.driver_counter_amount.toFixed(2)}
                </span>
              </div>
            )}

            {request.final_agreed_amount && (
              <div className="flex items-center justify-between p-4 border-2 border-green-500 rounded-xl bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Agreed Price</span>
                </div>
                <span className="font-bold text-xl text-green-600">
                  ${request.final_agreed_amount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Action Section */}
          {request.negotiation_status !== 'agreed' && (canBuyerAct || canDriverAct) && (
            <>
              <Separator />
              <div className="space-y-3">
                {showAcceptButton && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    onClick={handleAcceptOffer}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Accept {userRole === 'buyer' ? 'Counter' : 'Offer'} — ${
                      userRole === 'buyer' 
                        ? request.driver_counter_amount?.toFixed(2) 
                        : request.buyer_offer_amount?.toFixed(2)
                    }
                  </Button>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm">
                    {userRole === 'buyer' 
                      ? (request.negotiation_status === 'countered' ? 'Counter with New Offer' : 'Your Offer')
                      : 'Your Counter Offer'
                    } (USD)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleSubmitOffer}
                  disabled={loading || !amount}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {userRole === 'buyer' ? 'Submit Offer' : 'Send Counter'}
                </Button>
              </div>
            </>
          )}

          {request.negotiation_status === 'agreed' && (
            <div className="text-center py-3">
              <div className="inline-flex items-center gap-2 text-green-600 font-medium">
                <Check className="h-5 w-5" />
                Price has been agreed upon
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HireNegotiationDialog;