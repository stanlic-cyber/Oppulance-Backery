import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';
import { OrderFeeBreakdown } from '@/components/orders/OrderFeeBreakdown';
import {
  calculateOrderTotals,
  validateOrderInput,
  formatCurrency,
} from '@/lib/platformFee';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PlaceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    negotiable: boolean;
    farmer_id: string;
  };
}

export const PlaceOrderDialog = ({ open, onOpenChange, listing }: PlaceOrderDialogProps) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [offeredPrice, setOfferedPrice] = useState(listing.price_per_unit);
  const [loading, setLoading] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);

  // Fetch user's created_at for trial calculation
  useEffect(() => {
    const fetchUserCreatedAt = async () => {
      if (!user) return;
      
      // First try to get from profile
      if (profile?.created_at) {
        setUserCreatedAt(profile.created_at);
        return;
      }
      
      // Fallback to fetching from profiles table
      const { data } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data?.created_at) {
        setUserCreatedAt(data.created_at);
      }
    };
    
    fetchUserCreatedAt();
  }, [user, profile]);

  // Calculate totals
  const orderTotals = userCreatedAt
    ? calculateOrderTotals(quantity, offeredPrice, userCreatedAt)
    : { subtotal: quantity * offeredPrice, platform_fee_percent: 0, platform_fee_amount: 0, total_amount: quantity * offeredPrice };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Require phone verification before placing an order (anti-fraud)
    if (!profile?.phone_verified_at) {
      toast.error('Please verify your phone number to place an order.');
      onOpenChange(false);
      navigate('/settings/verify-phone');
      return;
    }

    // Validate order input
    const validation = validateOrderInput(quantity, offeredPrice, listing.quantity);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // Fail-safe: Ensure we have user creation date for fee calculation
    if (!userCreatedAt) {
      toast.error('Unable to calculate totals. Please try again.');
      return;
    }

    // Calculate final totals
    const totals = calculateOrderTotals(quantity, offeredPrice, userCreatedAt);

    // Final validation: Ensure all values are valid
    if (
      isNaN(totals.subtotal) ||
      isNaN(totals.platform_fee_amount) ||
      isNaN(totals.total_amount) ||
      totals.subtotal <= 0 ||
      totals.total_amount <= 0
    ) {
      toast.error('Unable to calculate totals. Please try again.');
      return;
    }

    setLoading(true);
    // Optimistic UX: close dialog + navigate immediately, write in background
    const toastId = toast.loading('Placing your order...');
    onOpenChange(false);
    navigate('/my-orders');

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          listing_id: listing.id,
          buyer_id: user.id,
          quantity,
          offered_price: offeredPrice,
          subtotal: totals.subtotal,
          platform_fee_percent: totals.platform_fee_percent,
          platform_fee_amount: totals.platform_fee_amount,
          total_amount: totals.total_amount,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;

      const messageText = `Offer placed: ${quantity} ${listing.unit} at $${formatCurrency(offeredPrice)}/${listing.unit}`;

      // Send initial offer message
      await supabase.from('messages').insert([{
        order_id: data.id,
        sender_id: user.id,
        type: 'offer',
        text: messageText,
        meta: { quantity, offered_price: offeredPrice },
      }]);

      // Send email notification to farmer (fire-and-forget)
      supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'new_order',
          order_id: data.id,
          sender_id: user.id,
          recipient_id: listing.farmer_id,
          listing_title: listing.title,
          message_text: messageText,
          offered_price: offeredPrice,
        },
      }).catch((emailErr) => console.error('Email notification failed:', emailErr));

      haptic('success');
      toast.success('Order placed successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Error placing order:', err);
      haptic('error');
      toast.error(err.message || 'Failed to place order. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('order.place')}</DialogTitle>
          <DialogDescription>
            {listing.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">{t('order.quantity')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                min={1}
                max={listing.quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="flex-1"
              />
              <span className="text-muted-foreground">{listing.unit}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Max available: {listing.quantity} {listing.unit}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">
              {t('order.offer')} (per {listing.unit})
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min={0.01}
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(Math.max(0.01, Number(e.target.value)))}
                className="flex-1"
                disabled={!listing.negotiable}
              />
            </div>
            {!listing.negotiable && (
              <p className="text-xs text-muted-foreground">
                Price is fixed by the seller
              </p>
            )}
            {listing.negotiable && (
              <p className="text-xs text-muted-foreground">
                Listed price: ${formatCurrency(listing.price_per_unit)}/{listing.unit}
              </p>
            )}
          </div>

          <OrderFeeBreakdown
            subtotal={orderTotals.subtotal}
            platformFeePercent={orderTotals.platform_fee_percent}
            platformFeeAmount={orderTotals.platform_fee_amount}
            totalAmount={orderTotals.total_amount}
          />

          <p className="text-xs text-muted-foreground">
            {t('payment.notice')}
          </p>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !userCreatedAt}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Placing...
                </>
              ) : (
                t('order.place')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
