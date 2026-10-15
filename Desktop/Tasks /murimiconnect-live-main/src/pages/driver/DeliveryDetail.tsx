import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Truck, MapPin, Package, DollarSign, Clock, User, 
  Loader2, ArrowLeft, Send, AlertTriangle, CheckCircle,
  Phone, MessageSquare, Lock
} from 'lucide-react';

// Lazy load map to avoid SSR issues with Leaflet
const DeliveryMap = lazy(() => import('@/components/delivery/DeliveryMap').then(m => ({ default: m.DeliveryMap })));
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_FEE_USD, SUPPORT_PHONE } from '@/lib/constants';
import { toast } from 'sonner';
import { useLockedCheck } from '@/hooks/useLockedCheck';

interface DeliveryRequest {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  pickup_province: string;
  pickup_town: string | null;
  dropoff_province: string;
  dropoff_town: string | null;
  cargo_type: string;
  cargo_quantity: string;
  cargo_weight: string | null;
  packaging_notes: string | null;
  preferred_pickup_time: string | null;
  special_instructions: string | null;
  status: string;
  agreed_price: number | null;
  assigned_driver_id: string | null;
  platform_fee_paid: boolean;
  created_at: string;
}

interface Bid {
  id: string;
  driver_id: string;
  bid_price: number;
  eta_text: string | null;
  note: string | null;
  status: string;
  created_at: string;
}

interface Profile {
  name: string;
  phone: string | null;
}

const DeliveryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, driverProfile, role } = useAuth();
  const navigate = useNavigate();
  const { isAccountRestricted, checkLocked } = useLockedCheck();
  
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<Profile | null>(null);
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Bid form
  const [bidPrice, setBidPrice] = useState('');
  const [bidEta, setBidEta] = useState('');
  const [bidNote, setBidNote] = useState('');
  
  // Confirm pickup dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;

    try {
      // ✅ FIX IDOR-005: First fetch limited fields to verify access
      const { data: reqData, error: reqError } = await supabase
        .from('delivery_requests')
        .select('id, buyer_id, seller_id, assigned_driver_id, status')
        .eq('id', id)
        .single();

      if (reqError) {
        toast.error('Delivery request not found');
        navigate('/marketplace');
        return;
      }

      // ✅ Immediately verify user is authorized to view this request
      const isAuthorized =
        reqData.buyer_id === user.id ||
        reqData.seller_id === user.id ||
        reqData.assigned_driver_id === user.id;

      if (!isAuthorized) {
        toast.error('Unauthorized: You do not have access to this delivery request');
        navigate(-1);
        return;
      }

      // ✅ Only after authorization, fetch full details
      const { data: fullRequest, error: fullError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fullError) throw fullError;
      setRequest(fullRequest);

      // Fetch bids for this request (RLS should protect these)
      const { data: bidsData } = await supabase
        .from('delivery_bids')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: false });

      setBids(bidsData || []);
      setMyBid(bidsData?.find(b => b.driver_id === user.id) || null);

      // Fetch profiles
      const { data: buyerData } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', reqData.buyer_id)
        .single();
      setBuyerProfile(buyerData);

      const { data: sellerData } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', reqData.seller_id)
        .single();
      setSellerProfile(sellerData);

      // Fetch wallet balance for driver
      if (role === 'driver') {
        const { data: walletData } = await supabase
          .from('driver_wallets')
          .select('balance_usd')
          .eq('driver_id', user.id)
          .single();
        setWalletBalance(walletData?.balance_usd || 0);
      }
    } catch (err) {
      console.error('Error fetching delivery:', err);
      toast.error('Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  }, [id, user, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for delivery status changes
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`delivery-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
          filter: `id=eq.${id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchData]);

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !request) return;

    // Check if driver account is locked
    if (checkLocked('submit a bid')) return;

    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('delivery_bids')
        .insert({
          request_id: request.id,
          driver_id: user.id,
          bid_price: price,
          eta_text: bidEta || null,
          note: bidNote || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already submitted a bid');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Bid submitted successfully!');
      fetchData();
      setBidPrice('');
      setBidEta('');
      setBidNote('');
    } catch (err: any) {
      console.error('Error submitting bid:', err);
      toast.error(err.message || 'Failed to submit bid');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!user || !request) return;

    // Check if driver account is locked
    if (checkLocked('confirm pickup')) return;

    if (walletBalance < PLATFORM_FEE_USD) {
      toast.error(`Insufficient wallet balance. You need at least $${PLATFORM_FEE_USD} to confirm pickup.`);
      return;
    }

    setSubmitting(true);
    try {
      // Call the deduct_platform_fee function
      const { data: success, error } = await supabase.rpc('deduct_platform_fee', {
        p_driver_id: user.id,
        p_delivery_id: request.id,
        p_amount: PLATFORM_FEE_USD,
      });

      if (error) throw error;

      if (!success) {
        toast.error('Failed to deduct platform fee. Please check your wallet balance.');
        return;
      }

      // Update delivery status
      const { error: updateError } = await supabase
        .from('delivery_requests')
        .update({ status: 'pickup_confirmed' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success('Pickup confirmed! $5 platform fee deducted.');
      setShowConfirmDialog(false);
      fetchData();
    } catch (err: any) {
      console.error('Error confirming pickup:', err);
      toast.error(err.message || 'Failed to confirm pickup');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'in_transit' | 'delivered' | 'completed') => {
    if (!request) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ status: newStatus })
        .eq('id', request.id);

      if (error) throw error;

      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchData();
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      pickup_confirmed: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!request) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Delivery not found</h1>
          <Button asChild>
            <Link to="/driver">Back to Dashboard</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isAssignedDriver = request.assigned_driver_id === user?.id;
  const canBid = request.status === 'open' && role === 'driver' && !myBid && !isAccountRestricted;
  const canConfirmPickup = isAssignedDriver && request.status === 'assigned' && !isAccountRestricted;
  const canUpdateToInTransit = isAssignedDriver && request.status === 'pickup_confirmed';
  const canMarkDelivered = isAssignedDriver && request.status === 'in_transit';

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen">
        <div className="container py-6 max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Delivery Details</h1>
              <p className="text-sm text-muted-foreground">
                Created {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge className={getStatusBadge(request.status)}>
              {formatStatus(request.status)}
            </Badge>
          </div>

          {/* Low Balance Warning */}
          {role === 'driver' && walletBalance < PLATFORM_FEE_USD && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low Wallet Balance</AlertTitle>
              <AlertDescription>
                You need at least ${PLATFORM_FEE_USD} in your wallet to confirm pickup.
                <Button variant="link" className="p-0 h-auto ml-1" asChild>
                  <Link to="/driver/wallet">Top up now</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Cargo Info */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Cargo Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  <div>
                    <p className="font-semibold">{request.cargo_type}</p>
                    <p className="text-sm text-muted-foreground">{request.cargo_quantity}</p>
                  </div>
                </div>
                {request.cargo_weight && (
                  <p className="text-sm"><strong>Weight:</strong> {request.cargo_weight}</p>
                )}
                {request.packaging_notes && (
                  <p className="text-sm"><strong>Packaging:</strong> {request.packaging_notes}</p>
                )}
                {request.special_instructions && (
                  <p className="text-sm"><strong>Instructions:</strong> {request.special_instructions}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Route */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Pickup</p>
                    <p className="text-muted-foreground">
                      {request.pickup_province}
                      {request.pickup_town && `, ${request.pickup_town}`}
                    </p>
                    {request.preferred_pickup_time && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {request.preferred_pickup_time}
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-muted-foreground/30 h-4 ml-2.5" />
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Dropoff</p>
                    <p className="text-muted-foreground">
                      {request.dropoff_province}
                      {request.dropoff_town && `, ${request.dropoff_town}`}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Map (for active deliveries) */}
          {isAssignedDriver && ['assigned', 'pickup_confirmed', 'in_transit'].includes(request.status) && (
            <Suspense fallback={
              <Card className="mb-4">
                <CardContent className="py-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
              </Card>
            }>
              <div className="mb-4">
                <DeliveryMap
                  deliveryId={request.id}
                  driverId={request.assigned_driver_id}
                  pickupProvince={request.pickup_province}
                  pickupTown={request.pickup_town}
                  dropoffProvince={request.dropoff_province}
                  dropoffTown={request.dropoff_town}
                  status={request.status}
                />
              </div>
            </Suspense>
          )}

          {/* Contacts (only shown after assignment) */}
          {isAssignedDriver && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Seller</p>
                    <p className="font-medium">{sellerProfile?.name || 'Seller'}</p>
                  </div>
                  {sellerProfile?.phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${sellerProfile.phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Buyer</p>
                    <p className="font-medium">{buyerProfile?.name || 'Buyer'}</p>
                  </div>
                  {buyerProfile?.phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${buyerProfile.phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Driver Actions */}
          {isAssignedDriver && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canConfirmPickup && (
                  <>
                    <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Platform Fee:</strong> Confirming pickup will deduct ${PLATFORM_FEE_USD} from your wallet immediately. This fee is non-refundable even if cancelled later.
                      </AlertDescription>
                    </Alert>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Your wallet: <strong>${walletBalance.toFixed(2)}</strong></span>
                      <Button 
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={walletBalance < PLATFORM_FEE_USD || submitting}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Pickup
                      </Button>
                    </div>
                  </>
                )}

                {canUpdateToInTransit && (
                  <Button onClick={() => handleUpdateStatus('in_transit')} disabled={submitting} className="w-full">
                    <Truck className="h-4 w-4 mr-2" />
                    Start Delivery (In Transit)
                  </Button>
                )}

                {canMarkDelivered && (
                  <Button onClick={() => handleUpdateStatus('delivered')} disabled={submitting} className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}

                {request.status === 'delivered' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Waiting for buyer to confirm delivery completion.
                  </p>
                )}

                {request.status === 'completed' && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-600">Delivery Completed!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Bid (for drivers on open requests) */}
          {canBid && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Submit Your Bid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitBid} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Your Price (USD) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        value={bidPrice}
                        onChange={(e) => setBidPrice(e.target.value)}
                        placeholder="e.g. 50"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">ETA (optional)</label>
                      <Input
                        value={bidEta}
                        onChange={(e) => setBidEta(e.target.value)}
                        placeholder="e.g. Same day"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Note to buyer (optional)</label>
                    <Textarea
                      value={bidNote}
                      onChange={(e) => setBidNote(e.target.value)}
                      placeholder="e.g. I have a covered truck, can pick up today"
                      rows={2}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Bid
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* My Bid (if already submitted) */}
          {myBid && request.status === 'open' && (
            <Card className="mb-4 border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-primary">Your Bid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">${myBid.bid_price.toFixed(2)}</p>
                    {myBid.eta_text && (
                      <p className="text-sm text-muted-foreground">ETA: {myBid.eta_text}</p>
                    )}
                  </div>
                  <Badge>{myBid.status === 'pending' ? 'Awaiting Response' : myBid.status}</Badge>
                </div>
                {myBid.note && (
                  <p className="text-sm mt-2 p-2 bg-muted/50 rounded">{myBid.note}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* All Bids (for buyer/seller view) */}
          {(request.buyer_id === user?.id || request.seller_id === user?.id) && bids.length > 0 && request.status === 'open' && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Driver Bids ({bids.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bids.map((bid) => (
                  <BidCard 
                    key={bid.id} 
                    bid={bid} 
                    requestId={request.id}
                    onAccept={fetchData}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Notice */}
          <Alert className="bg-muted/50">
            <DollarSign className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Delivery payment is agreed directly between buyer and driver (EcoCash/OneMoney/Bank). Murimi Connect does not hold money.
            </AlertDescription>
          </Alert>

          {/* Support */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Need help? Contact support: {SUPPORT_PHONE}
          </p>
        </div>
      </div>

      {/* Confirm Pickup Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Pickup Job
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                By confirming, <strong>${PLATFORM_FEE_USD} USD</strong> will be deducted from your wallet immediately as a platform fee.
              </p>
              <p className="text-destructive font-medium">
                This fee is non-refundable, even if you cancel the delivery later.
              </p>
              <p className="text-sm">
                Your current balance: <strong>${walletBalance.toFixed(2)}</strong>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPickup} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Yes, Confirm Pickup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

// Bid Card Component
interface BidCardProps {
  bid: Bid;
  requestId: string;
  onAccept: () => void;
}

const BidCard = ({ bid, requestId, onAccept }: BidCardProps) => {
  const [driverName, setDriverName] = useState('Driver');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fetchDriver = async () => {
      const { data } = await supabase
        .from('driver_profiles')
        .select('name')
        .eq('user_id', bid.driver_id)
        .single();
      if (data) setDriverName(data.name);
    };
    fetchDriver();
  }, [bid.driver_id]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // Update bid status
      await supabase
        .from('delivery_bids')
        .update({ status: 'accepted' })
        .eq('id', bid.id);

      // Update delivery request
      await supabase
        .from('delivery_requests')
        .update({
          status: 'assigned',
          assigned_driver_id: bid.driver_id,
          agreed_price: bid.bid_price,
        })
        .eq('id', requestId);

      // Reject other bids
      await supabase
        .from('delivery_bids')
        .update({ status: 'rejected' })
        .eq('request_id', requestId)
        .neq('id', bid.id);

      toast.success('Driver accepted! They can now confirm pickup.');
      onAccept();
    } catch (err: any) {
      console.error('Error accepting bid:', err);
      toast.error('Failed to accept bid');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{driverName}</span>
        </div>
        <p className="text-lg font-bold text-primary">${bid.bid_price.toFixed(2)}</p>
        {bid.eta_text && (
          <p className="text-xs text-muted-foreground">ETA: {bid.eta_text}</p>
        )}
        {bid.note && (
          <p className="text-xs text-muted-foreground mt-1">"{bid.note}"</p>
        )}
      </div>
      <Button size="sm" onClick={handleAccept} disabled={accepting}>
        {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
      </Button>
    </div>
  );
};

export default DeliveryDetail;
