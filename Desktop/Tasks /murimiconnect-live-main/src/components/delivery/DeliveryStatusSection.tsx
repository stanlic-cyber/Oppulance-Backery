import { useState, useEffect, Suspense, lazy } from 'react';
import { Truck, MapPin, Clock, User, DollarSign, Loader2, Plus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CreateDeliveryRequestDialog } from './CreateDeliveryRequestDialog';
import { ConfirmDeliveryDialog } from './ConfirmDeliveryDialog';
import { DeliveryTimeline } from './DeliveryTimeline';

// Lazy load the map component to avoid SSR issues with Leaflet
const DeliveryMap = lazy(() => import('./DeliveryMap').then(m => ({ default: m.DeliveryMap })));

interface DeliveryRequest {
  id: string;
  status: string;
  pickup_province: string;
  pickup_town: string | null;
  dropoff_province: string;
  dropoff_town: string | null;
  cargo_type: string;
  cargo_quantity: string;
  agreed_price: number | null;
  assigned_driver_id: string | null;
  created_at: string;
}

interface DriverProfile {
  name: string;
  phone: string | null;
  vehicle_type: string;
}

interface DeliveryStatusSectionProps {
  orderId: string;
  order: {
    id: string;
    listing_title: string;
    listing_unit: string;
    quantity: number;
    farmer_id: string;
    status: string;
  };
  isBuyer: boolean;
}

export const DeliveryStatusSection = ({ orderId, order, isBuyer }: DeliveryStatusSectionProps) => {
  const [deliveryRequest, setDeliveryRequest] = useState<DeliveryRequest | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchDeliveryRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) throw error;
      setDeliveryRequest(data);

      // Fetch driver profile if assigned
      if (data?.assigned_driver_id) {
        const { data: driverData } = await supabase
          .from('driver_profiles')
          .select('name, phone, vehicle_type')
          .eq('user_id', data.assigned_driver_id)
          .maybeSingle();
        
        setDriverProfile(driverData);
      }
    } catch (err) {
      console.error('Error fetching delivery request:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryRequest();
  }, [orderId]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      pickup_confirmed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      in_transit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Card className="mt-4">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Only show for confirmed/completed orders
  const canRequestDelivery = ['accepted', 'confirmed', 'ready_for_delivery'].includes(order.status);

  if (!deliveryRequest && !canRequestDelivery) {
    return null;
  }

  if (!deliveryRequest && isBuyer && canRequestDelivery) {
    return (
      <>
        <Card className="mt-4 border-dashed">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Need delivery?</p>
                  <p className="text-sm text-muted-foreground">
                    Request a driver to transport your produce
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Request Delivery
              </Button>
            </div>
          </CardContent>
        </Card>

        <CreateDeliveryRequestDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          order={{
            id: order.id,
            listing_title: order.listing_title,
            listing_unit: order.listing_unit,
            quantity: order.quantity,
            farmer_id: order.farmer_id,
          }}
          onCreated={fetchDeliveryRequest}
        />
      </>
    );
  }

  if (!deliveryRequest) return null;

  const showMap = ['assigned', 'pickup_confirmed', 'in_transit'].includes(deliveryRequest.status);

  return (
    <div className="mt-4 space-y-4">
      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery Progress
            </span>
            <Badge className={getStatusBadge(deliveryRequest.status)}>
              {formatStatus(deliveryRequest.status)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryTimeline 
            status={deliveryRequest.status} 
            createdAt={deliveryRequest.created_at} 
          />
        </CardContent>
      </Card>

      {/* Map (only show for active deliveries) */}
      {showMap && (
        <Suspense fallback={
          <Card>
            <CardContent className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        }>
          <DeliveryMap
            deliveryId={deliveryRequest.id}
            driverId={deliveryRequest.assigned_driver_id}
            pickupProvince={deliveryRequest.pickup_province}
            pickupTown={deliveryRequest.pickup_town}
            dropoffProvince={deliveryRequest.dropoff_province}
            dropoffTown={deliveryRequest.dropoff_town}
            status={deliveryRequest.status}
          />
        </Suspense>
      )}

      {/* Status Card */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Route */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>{deliveryRequest.pickup_province}</span>
            <span className="text-muted-foreground">→</span>
            <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span>{deliveryRequest.dropoff_province}</span>
          </div>

          {/* Driver Info (if assigned) - Phone only shown for active deliveries */}
          {driverProfile && (
            <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-lg">
              <User className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium">{driverProfile.name}</p>
                <p className="text-xs text-muted-foreground">{driverProfile.vehicle_type}</p>
              </div>
            </div>
          )}

          {/* Agreed Price */}
          {deliveryRequest.agreed_price && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium">Delivery: ${deliveryRequest.agreed_price.toFixed(2)}</span>
            </div>
          )}

          {/* Status-specific info */}
          {deliveryRequest.status === 'open' && (
            <p className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              Waiting for driver bids...
            </p>
          )}

          {deliveryRequest.status === 'assigned' && (
            <p className="text-xs text-muted-foreground">
              Driver assigned. Waiting for pickup confirmation.
            </p>
          )}

          {deliveryRequest.status === 'in_transit' && (
            <p className="text-xs text-primary font-medium">
              🚚 Your produce is on the way!
            </p>
          )}

          {deliveryRequest.status === 'delivered' && isBuyer && (
            <div className="space-y-2">
              <p className="text-xs text-green-600 font-medium">
                ✓ Delivered! Please confirm receipt to complete.
              </p>
              <Button 
                onClick={() => setShowConfirmDialog(true)}
                className="w-full"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Receipt & Rate Driver
              </Button>
            </div>
          )}

          {deliveryRequest.status === 'completed' && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Delivery completed successfully!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirm Delivery Dialog */}
      {deliveryRequest.assigned_driver_id && (
        <ConfirmDeliveryDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          deliveryRequest={{
            id: deliveryRequest.id,
            assigned_driver_id: deliveryRequest.assigned_driver_id,
          }}
          onConfirmed={fetchDeliveryRequest}
        />
      )}
    </div>
  );
};
