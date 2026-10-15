import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Wallet, Package, Clock, CheckCircle, MapPin, Loader2, AlertCircle, TrendingUp, ToggleLeft, ToggleRight, Navigation, Star, Lock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_FEE_USD, VEHICLE_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useFeeStatus } from '@/hooks/useFeeStatus';
import DriverHireRequests from '@/components/driver/DriverHireRequests';

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
  status: string;
  agreed_price: number | null;
  created_at: string;
}

interface WalletData {
  balance_usd: number;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount_usd: number;
  reason: string;
  created_at: string;
}

const DriverDashboard = () => {
  const { user, driverProfile, role, refreshDriverProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [openRequests, setOpenRequests] = useState<DeliveryRequest[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<DeliveryRequest[]>([]);
  const [activeTab, setActiveTab] = useState('available');
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  
  const { isTracking, currentLocation, startTracking, stopTracking } = useDriverLocation();
  const { isLocked, isAwaitingVerification, isOtpIssued, loading: feeLoading } = useFeeStatus();
  
  const isAccountRestricted = isLocked || isAwaitingVerification || isOtpIssued;

  useEffect(() => {
    if (role !== 'driver') {
      navigate('/marketplace');
      return;
    }

    if (role === 'driver' && !driverProfile) {
      navigate('/driver/setup');
      return;
    }

    setIsAvailable((driverProfile as any)?.is_available ?? true);
    fetchData();
  }, [user, role, driverProfile]);

  const toggleAvailability = async () => {
    if (!user) return;
    
    // Check if trying to go online while account is restricted
    if (!isAvailable && isAccountRestricted) {
      if (isLocked) {
        toast.error('Cannot go online - your account is locked due to unpaid platform fees.');
      } else if (isAwaitingVerification) {
        toast.error('Cannot go online - please wait for your payment to be verified.');
      } else if (isOtpIssued) {
        toast.error('Cannot go online - please enter your OTP to unlock your account.');
      }
      return;
    }
    
    setTogglingAvailability(true);
    try {
      const newStatus = !isAvailable;
      const { error } = await supabase
        .from('driver_profiles')
        .update({ 
          is_available: newStatus,
          is_online: newStatus,
          current_status: newStatus ? 'available' : 'offline',
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setIsAvailable(newStatus);
      
      // Start/stop location tracking based on availability
      if (newStatus) {
        startTracking();
        toast.success('You are now online and available for deliveries');
      } else {
        stopTracking();
        toast.success('You are now offline');
      }
      
      await refreshDriverProfile();
    } catch (err) {
      console.error('Error toggling availability:', err);
      toast.error('Failed to update availability');
    } finally {
      setTogglingAvailability(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch wallet
      const { data: walletData } = await supabase
        .from('driver_wallets')
        .select('balance_usd')
        .eq('driver_id', user.id)
        .maybeSingle();

      setWallet(walletData);

      // Fetch transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setTransactions(txData || []);

      // Fetch open delivery requests
      const { data: openData } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50);

      setOpenRequests(openData || []);

      // Fetch my deliveries
      const { data: myData } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('assigned_driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setMyDeliveries(myData || []);
    } catch (err) {
      console.error('Error fetching driver data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleLabel = (type: string) => {
    return VEHICLE_TYPES.find(v => v.id === type)?.label || type;
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
      failed: 'bg-red-100 text-red-800',
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

  return (
    <Layout>
      <PageHeader 
        title="Driver Dashboard" 
        backTo="/"
        action={
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isAccountRestricted ? 'bg-destructive/10 text-destructive' : 
              isAvailable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {isAccountRestricted ? (
                <><Lock className="h-3 w-3" />Locked</>
              ) : isAvailable ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Online</>
              ) : (
                <><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />Offline</>
              )}
            </div>
            <Switch
              checked={isAvailable && !isAccountRestricted}
              onCheckedChange={toggleAvailability}
              disabled={togglingAvailability || (isAccountRestricted && !isAvailable)}
            />
          </div>
        }
      />
      <div className="bg-muted/30 min-h-screen pb-24 md:pb-8">
        <div className="container py-4 md:py-6">
          {/* Driver info bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {driverProfile?.name} • {getVehicleLabel(driverProfile?.vehicle_type || '')}
            </p>
            <Button variant="outline" size="sm" asChild className="rounded-xl h-8">
              <Link to="/driver/earnings">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />Earnings
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Wallet Balance</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  ${(wallet?.balance_usd || 0).toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(wallet?.balance_usd || 0) < PLATFORM_FEE_USD && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Low balance - top up to confirm pickups
                  </p>
                )}
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <Link to="/driver/wallet">Manage Wallet</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Available Jobs</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  {openRequests.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Open delivery requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Deliveries</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  {myDeliveries.filter(d => !['completed', 'cancelled', 'failed'].includes(d.status)).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  In progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {myDeliveries.filter(d => d.status === 'completed').length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Total deliveries done
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="available">
                Available Jobs ({openRequests.length})
              </TabsTrigger>
              <TabsTrigger value="my-deliveries">
                My Deliveries ({myDeliveries.length})
              </TabsTrigger>
              <TabsTrigger value="hire-requests">
                Hire Requests
              </TabsTrigger>
              <TabsTrigger value="wallet">
                Wallet History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              {openRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No delivery requests available</h3>
                    <p className="text-muted-foreground">
                      Check back later for new delivery opportunities
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {openRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                                📦
                              </div>
                              <div>
                                <h3 className="font-semibold">{request.cargo_type}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {request.cargo_quantity}
                                  {request.cargo_weight && ` • ${request.cargo_weight}`}
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                                <div>
                                  <p className="font-medium">Pickup</p>
                                  <p className="text-muted-foreground">
                                    {request.pickup_province}
                                    {request.pickup_town && `, ${request.pickup_town}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                                <div>
                                  <p className="font-medium">Dropoff</p>
                                  <p className="text-muted-foreground">
                                    {request.dropoff_province}
                                    {request.dropoff_town && `, ${request.dropoff_town}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getStatusBadge(request.status)}>
                              {formatStatus(request.status)}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                            <Button size="sm" asChild>
                              <Link to={`/driver/delivery/${request.id}`}>
                                View & Bid
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-deliveries">
              {myDeliveries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No deliveries yet</h3>
                    <p className="text-muted-foreground">
                      Browse available jobs and start bidding!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                                🚛
                              </div>
                              <div>
                                <h3 className="font-semibold">{delivery.cargo_type}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {delivery.cargo_quantity}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <span>{delivery.pickup_province}</span>
                              <span>→</span>
                              <span>{delivery.dropoff_province}</span>
                            </div>

                            {delivery.agreed_price && (
                              <p className="text-primary font-bold mt-2">
                                ${delivery.agreed_price.toFixed(2)}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getStatusBadge(delivery.status)}>
                              {formatStatus(delivery.status)}
                            </Badge>
                            <Button size="sm" asChild>
                              <Link to={`/driver/delivery/${delivery.id}`}>
                                Manage
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="hire-requests">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Direct Hire Requests
                  </CardTitle>
                  <CardDescription>
                    Requests from buyers who want to hire you directly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DriverHireRequests />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wallet">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No transactions yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">
                              {tx.type === 'topup' ? '+ Top Up' : '- Deduction'}
                            </p>
                            <p className="text-sm text-muted-foreground">{tx.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleString()}
                            </p>
                          </div>
                          <span className={`font-bold ${tx.type === 'topup' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'topup' ? '+' : '-'}${tx.amount_usd.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default DriverDashboard;
