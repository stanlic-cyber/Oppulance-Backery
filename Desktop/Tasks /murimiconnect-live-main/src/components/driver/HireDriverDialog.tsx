import { useState } from 'react';
import { Loader2, Send, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface HireDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: {
    user_id: string;
    name: string;
  };
  onSuccess?: () => void;
}

const HireDriverDialog = ({ open, onOpenChange, driver, onSuccess }: HireDriverDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [notes, setNotes] = useState('');
  const [offerAmount, setOfferAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to hire a driver');
      return;
    }

    if (!pickupLocation.trim() || !dropoffLocation.trim() || !deliveryDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const insertData: any = {
        buyer_id: user.id,
        driver_id: driver.user_id,
        pickup_location: pickupLocation.trim(),
        dropoff_location: dropoffLocation.trim(),
        delivery_date: deliveryDate,
        delivery_time: deliveryTime || null,
        notes: notes.trim() || null,
        negotiation_status: 'open',
      };

      // Add offer amount if provided
      if (offerAmount) {
        const numAmount = parseFloat(offerAmount);
        if (!isNaN(numAmount) && numAmount > 0) {
          insertData.buyer_offer_amount = numAmount;
        }
      }

      const { error } = await supabase
        .from('driver_hire_requests')
        .insert(insertData);

      if (error) throw error;

      toast.success(`Request sent to ${driver.name}!`);
      onOpenChange(false);
      setPickupLocation('');
      setDropoffLocation('');
      setDeliveryDate('');
      setDeliveryTime('');
      setNotes('');
      setOfferAmount('');
      onSuccess?.();
    } catch (err: any) {
      console.error('Error creating hire request:', err);
      toast.error(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hire {driver.name}</DialogTitle>
          <DialogDescription>
            Send a delivery request to this driver. They will review and respond to your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pickup">Pickup Location *</Label>
            <Input
              id="pickup"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. 123 Main St, Harare"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoff">Drop-off Location *</Label>
            <Input
              id="dropoff"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              placeholder="e.g. 456 Market Ave, Bulawayo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Delivery Date *</Label>
              <Input
                id="date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={today}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Preferred Time</Label>
              <Input
                id="time"
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer">Your Offer (USD) - Optional</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="offer"
                type="number"
                min="0"
                step="0.01"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="0.00"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional: Propose a price for this delivery
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fragile items, need cold storage, etc."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HireDriverDialog;
