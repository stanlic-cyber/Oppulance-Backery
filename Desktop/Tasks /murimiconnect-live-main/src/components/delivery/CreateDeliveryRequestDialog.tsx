import { useState } from 'react';
import { Truck, MapPin, Package, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ZIMBABWE_PROVINCES } from '@/lib/constants';
import { toast } from 'sonner';

interface CreateDeliveryRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    listing_title: string;
    listing_unit: string;
    quantity: number;
    farmer_id: string;
    farmer_province?: string;
    buyer_province?: string;
  };
  onCreated: () => void;
}

export const CreateDeliveryRequestDialog = ({
  open,
  onOpenChange,
  order,
  onCreated,
}: CreateDeliveryRequestDialogProps) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [pickupProvince, setPickupProvince] = useState(order.farmer_province || '');
  const [pickupTown, setPickupTown] = useState('');
  const [dropoffProvince, setDropoffProvince] = useState(order.buyer_province || profile?.province || '');
  const [dropoffTown, setDropoffTown] = useState(profile?.nearest_town || '');
  const [cargoWeight, setCargoWeight] = useState('');
  const [packagingNotes, setPackagingNotes] = useState('');
  const [preferredPickupTime, setPreferredPickupTime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (!pickupProvince || !dropoffProvince) {
      toast.error('Please select pickup and dropoff provinces');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('delivery_requests')
        .insert({
          order_id: order.id,
          buyer_id: user.id,
          seller_id: order.farmer_id,
          pickup_province: pickupProvince,
          pickup_town: pickupTown || null,
          dropoff_province: dropoffProvince,
          dropoff_town: dropoffTown || null,
          cargo_type: order.listing_title,
          cargo_quantity: `${order.quantity} ${order.listing_unit}`,
          cargo_weight: cargoWeight || null,
          packaging_notes: packagingNotes || null,
          preferred_pickup_time: preferredPickupTime || null,
          special_instructions: specialInstructions || null,
          status: 'open',
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('A delivery request already exists for this order');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Delivery request created! Drivers can now bid.');
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating delivery request:', err);
      toast.error(err.message || 'Failed to create delivery request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Request Delivery
          </DialogTitle>
          <DialogDescription>
            Create a delivery request for your order. Drivers will submit bids and you can choose the best offer.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-muted/50">
          <Package className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">{order.listing_title}</span>
            <br />
            Quantity: {order.quantity} {order.listing_unit}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pickup Location */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-green-500" />
              Pickup Location (Seller)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Province *</Label>
                <Select value={pickupProvince} onValueChange={setPickupProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZIMBABWE_PROVINCES.map((prov) => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Town (optional)</Label>
                <Input
                  value={pickupTown}
                  onChange={(e) => setPickupTown(e.target.value)}
                  placeholder="e.g. Bindura"
                />
              </div>
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-red-500" />
              Dropoff Location (You)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Province *</Label>
                <Select value={dropoffProvince} onValueChange={setDropoffProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZIMBABWE_PROVINCES.map((prov) => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Town (optional)</Label>
                <Input
                  value={dropoffTown}
                  onChange={(e) => setDropoffTown(e.target.value)}
                  placeholder="e.g. Borrowdale"
                />
              </div>
            </div>
          </div>

          {/* Cargo Details */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              Cargo Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Weight (optional)</Label>
                <Input
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  placeholder="e.g. 500 kg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preferred Pickup</Label>
                <Input
                  value={preferredPickupTime}
                  onChange={(e) => setPreferredPickupTime(e.target.value)}
                  placeholder="e.g. Morning, Jan 25"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Packaging Notes (optional)</Label>
              <Textarea
                value={packagingNotes}
                onChange={(e) => setPackagingNotes(e.target.value)}
                placeholder="e.g. Packed in 50kg bags, needs covered transport"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Special Instructions (optional)</Label>
              <Textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Call before arriving, fragile items"
                rows={2}
              />
            </div>
          </div>

          <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
              Payment for delivery is agreed directly with the driver (EcoCash/OneMoney/Bank). Murimi Connect does not hold money.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Request Delivery
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
