import { useState } from 'react';
import { Check, X, Truck, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { OrderStatus, canTransition, getTimestampField } from '@/lib/orderStatus';
import { useAuth } from '@/contexts/AuthContext';
import { sendTxEmail, getUserEmail } from '@/lib/email';

type OrderUpdate = Database['public']['Tables']['orders']['Update'];

interface OrderStatusActionsProps {
  orderId: string;
  currentStatus: OrderStatus;
  isSeller: boolean;
  listingId?: string;
  quantity?: number;
  sellerId?: string;
  totalAmount?: number;
  onStatusChange: (newStatus: OrderStatus) => void;
  onOpenChat?: () => void;
}

export const OrderStatusActions = ({
  orderId,
  currentStatus,
  isSeller,
  listingId,
  quantity,
  sellerId,
  totalAmount,
  onStatusChange,
  onOpenChat,
}: OrderStatusActionsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Add platform fee when order is completed (for sellers)
  const addSellerPlatformFee = async () => {
    if (!sellerId || !totalAmount) return;
    
    try {
      // Get the fee percentage from public fee rates view
      const { data: feeRates } = await supabase
        .from('platform_fee_rates')
        .select('seller_fee_percent')
        .limit(1)
        .maybeSingle();
      
      const feePercent = feeRates?.seller_fee_percent || 5;
      const feeAmount = (totalAmount * feePercent) / 100;
      
      // Call the add_platform_fee function
      await supabase.rpc('add_platform_fee', {
        p_user_id: sellerId,
        p_user_type: 'seller',
        p_amount: feeAmount,
        p_fee_percent: feePercent,
        p_order_id: orderId,
        p_description: `Platform fee for order completion`,
      });
      
      console.log(`Added seller platform fee: $${feeAmount.toFixed(2)} (${feePercent}%)`);
    } catch (err) {
      console.error('Error adding seller platform fee:', err);
      // Don't block the order completion if fee addition fails
    }
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!canTransition(currentStatus, newStatus, isSeller)) {
      toast.error('You cannot perform this action');
      return;
    }

    setLoading(true);
    try {
      if (newStatus === 'confirmed') {
        if (!listingId || !quantity) {
          throw new Error('Missing listing details for stock reservation');
        }

        const { error } = await (supabase.rpc as any)('confirm_order_and_deduct_stock', {
          p_order_id: orderId,
        });

        if (error) throw error;
      } else {
        const updateData: OrderUpdate = { status: newStatus };
        
        const timestampField = getTimestampField(newStatus);
        if (timestampField) {
          updateData[timestampField] = new Date().toISOString();
        }

        const { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);

        if (error) throw error;
      }

      // Buyer confirms delivery → release escrow to seller
      if (newStatus === 'completed' && !isSeller) {
        const { error: relErr } = await supabase.rpc('escrow_release', { p_order_id: orderId } as any);
        if (relErr) console.error('Escrow release error:', relErr);
        else toast.success('Escrow released to seller');
      }

      // Order cancelled before fulfillment → refund escrow to buyer
      if (newStatus === 'cancelled') {
        const { error: refErr } = await supabase.rpc('escrow_refund', {
          p_order_id: orderId,
          p_reason: 'Order cancelled',
        } as any);
        if (refErr) console.error('Escrow refund error:', refErr);
      }

      // When order is completed, add platform fee for seller
      if (newStatus === 'completed' && sellerId && totalAmount) {
        await addSellerPlatformFee();
      }

      // ---- Transactional emails (best-effort) ----
      try {
        const orderShort = orderId.slice(0, 8).toUpperCase();
        const amt = totalAmount ? Number(totalAmount).toFixed(2) : '0.00';

        if (newStatus === 'confirmed') {
          // Notify counterparty (the OTHER side from current actor)
          const otherId = isSeller ? null /* buyer_id needed; fetch */ : sellerId ?? null;
          let target: string | null = null;
          if (isSeller) {
            const { data: o } = await supabase.from('orders').select('buyer_id').eq('id', orderId).maybeSingle();
            if (o?.buyer_id) target = await getUserEmail(o.buyer_id);
          } else if (otherId) {
            target = await getUserEmail(otherId);
          }
          sendTxEmail(target, 'order_confirmed', { orderId: orderShort });
        } else if (newStatus === 'completed') {
          // Notify the seller that funds were released
          if (sellerId) {
            const sellerEmail = await getUserEmail(sellerId);
            sendTxEmail(sellerEmail, 'escrow_released', { amount: amt, orderId: orderShort });
          }
        } else if (newStatus === 'cancelled') {
          // Notify both sides
          const { data: o } = await supabase.from('orders').select('buyer_id').eq('id', orderId).maybeSingle();
          if (o?.buyer_id) {
            const e = await getUserEmail(o.buyer_id);
            sendTxEmail(e, 'order_cancelled', { orderId: orderShort });
          }
          if (sellerId) {
            const e = await getUserEmail(sellerId);
            sendTxEmail(e, 'order_cancelled', { orderId: orderShort });
          }
        }
      } catch (err) {
        console.warn('email notify failed', err);
      }

      onStatusChange(newStatus);
      
      // Show success with helpful next step
      if (newStatus === 'confirmed') {
        toast.success('Order confirmed! You can now communicate freely with the buyer.', {
          duration: 5000,
          action: onOpenChat ? {
            label: 'Open Chat',
            onClick: onOpenChat,
          } : undefined,
        });
      } else if (newStatus === 'accepted') {
        toast.success('Order accepted! Confirm the deal to proceed.', { duration: 4000 });
      } else {
        toast.success(`Order ${newStatus.replace('_', ' ')}`);
      }
    } catch (err: any) {
      console.error('Error updating order:', err);
      toast.error(err.message || 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const renderSellerActions = () => {
    switch (currentStatus) {
      case 'pending':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => updateStatus('accepted')} 
              disabled={loading}
              className="bg-primary hover:bg-primary/90 shadow-sm"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              Accept Order
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => updateStatus('rejected')} 
              disabled={loading} 
              className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Decline
            </Button>
          </div>
        );
      case 'accepted':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus('confirmed')} 
            disabled={loading}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            Confirm & Enable Chat
          </Button>
        );
      case 'confirmed':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => updateStatus('ready_for_delivery')} 
              disabled={loading}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Truck className="h-3.5 w-3.5 mr-1.5" />}
              Mark Ready for Pickup
            </Button>
            {onOpenChat && (
              <Button variant="outline" size="sm" onClick={onOpenChat}>
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Message Buyer
              </Button>
            )}
          </div>
        );
      case 'ready_for_delivery':
        return onOpenChat ? (
          <Button variant="outline" size="sm" onClick={onOpenChat}>
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Message Buyer
          </Button>
        ) : null;
      default:
        return null;
    }
  };

  const renderBuyerActions = () => {
    switch (currentStatus) {
      case 'pending':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => updateStatus('cancelled')} 
            disabled={loading} 
            className="text-destructive hover:text-destructive border-destructive/30"
          >
            Cancel Order
          </Button>
        );
      case 'accepted':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => updateStatus('confirmed')} 
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Confirm Deal
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => updateStatus('cancelled')} 
              disabled={loading} 
              className="text-destructive hover:text-destructive border-destructive/30"
            >
              Cancel
            </Button>
          </div>
        );
      case 'confirmed':
        return onOpenChat ? (
          <Button variant="outline" size="sm" onClick={onOpenChat}>
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Message Seller
          </Button>
        ) : null;
      case 'ready_for_delivery':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => updateStatus('completed')} 
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-md"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              Mark Received
            </Button>
            {onOpenChat && (
              <Button variant="outline" size="sm" onClick={onOpenChat}>
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Message Seller
              </Button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isSeller ? renderSellerActions() : renderBuyerActions()}
    </div>
  );
};
