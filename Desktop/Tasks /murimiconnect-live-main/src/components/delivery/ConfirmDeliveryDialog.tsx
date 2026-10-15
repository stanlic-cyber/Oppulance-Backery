import { useState } from 'react';
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';

interface ConfirmDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryRequest: {
    id: string;
    assigned_driver_id: string;
  };
  onConfirmed: () => void;
}

export const ConfirmDeliveryDialog = ({
  open,
  onOpenChange,
  deliveryRequest,
  onConfirmed,
}: ConfirmDeliveryDialogProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      // Get delivery request details for fee calculation
      const { data: deliveryData } = await supabase
        .from('delivery_requests')
        .select('agreed_price, assigned_driver_id')
        .eq('id', deliveryRequest.id)
        .single();

      // Update delivery status to completed
      const { error: updateError } = await supabase
        .from('delivery_requests')
        .update({ status: 'completed' })
        .eq('id', deliveryRequest.id);

      if (updateError) throw updateError;

      // Add platform fee for driver
      if (deliveryData?.assigned_driver_id && deliveryData?.agreed_price) {
        try {
          // Get driver fee percentage from public fee rates view
          const { data: feeRates } = await supabase
            .from('platform_fee_rates')
            .select('driver_fee_percent')
            .limit(1)
            .maybeSingle();
          
          const feePercent = feeRates?.driver_fee_percent || 5;
          const feeAmount = (deliveryData.agreed_price * feePercent) / 100;
          
          await supabase.rpc('add_platform_fee', {
            p_user_id: deliveryData.assigned_driver_id,
            p_user_type: 'driver',
            p_amount: feeAmount,
            p_fee_percent: feePercent,
            p_delivery_request_id: deliveryRequest.id,
            p_description: `Platform fee for delivery completion`,
          });
          
          console.log(`Added driver platform fee: $${feeAmount.toFixed(2)} (${feePercent}%)`);
        } catch (feeErr) {
          console.error('Error adding driver platform fee:', feeErr);
          // Don't block delivery completion
        }
      }

      // Submit rating if provided
      if (rating > 0) {
        const { error: ratingError } = await supabase
          .from('delivery_ratings')
          .insert([{
            delivery_request_id: deliveryRequest.id,
            driver_id: deliveryRequest.assigned_driver_id,
            rater_id: user.id,
            rating,
            comment: comment.trim() || null,
          }]);

        if (ratingError) {
          console.error('Error saving rating:', ratingError);
          // Don't throw - delivery is already confirmed
        }
      }

      toast.success('Delivery confirmed! Thank you.');
      onConfirmed();
      onOpenChange(false);
      
      // Reset state
      setRating(0);
      setComment('');
    } catch (err: any) {
      console.error('Error confirming delivery:', err);
      toast.error(err.message || 'Failed to confirm delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Confirm Delivery
          </DialogTitle>
          <DialogDescription>
            Confirm that you've received your produce. You can optionally rate your driver.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              How was your delivery experience? (Optional)
            </p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm mt-2 text-primary font-medium">
                {rating === 5 ? 'Excellent!' : 
                 rating === 4 ? 'Great!' : 
                 rating === 3 ? 'Good' : 
                 rating === 2 ? 'Fair' : 'Poor'}
              </p>
            )}
          </div>

          {/* Comment */}
          {rating > 0 && (
            <div>
              <Textarea
                placeholder="Leave a comment about your experience (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};