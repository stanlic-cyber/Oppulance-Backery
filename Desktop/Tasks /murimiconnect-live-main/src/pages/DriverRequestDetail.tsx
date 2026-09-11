import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Loader2, 
  Truck, 
  DollarSign,
  MessageSquare,
  ArrowLeft,
  Phone,
  Check,
  X,
  CheckCircle
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HireNegotiationDialog from '@/components/driver/HireNegotiationDialog';
import DriverRequestChat from '@/components/driver/DriverRequestChat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HireRequest {
  id: string;
  buyer_id: string;
  driver_id: string;
  pickup_location: string;
  dropoff_location: string;
  delivery_date: string;
  delivery_time?: string;
  notes?: string;
  status: string;
  buyer_offer_amount?: number;
  driver_counter_amount?: number;
  final_agreed_amount?: number;
  currency?: string;
  negotiation_status?: string;
  created_at: string;
  buyer_profile?: {
    name: string;
    phone?: string;
  };
  driver_profile?: {
    name: string;
    phone?: string;
    province: string;
    vehicle_type: string;
  };
}

const DriverRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [request, setRequest] = useState<HireRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [negotiationOpen, setNegotiationOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (id && user) {
      fetchRequest();
    }
  }, [id, user, authLoading, navigate]);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_hire_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Verify user is participant
      if (data.buyer_id !== user?.id && data.driver_id !== user?.id) {
        toast.error('You do not have access to this request');
        navigate(-1);
        return;
      }

      // Fetch profiles - phone only visible for accepted/completed requests
      const isAccepted = data.status === 'accepted' || data.status === 'completed';
      
      const [buyerProfile, driverProfile] = await Promise.all([
        supabase.from('profiles').select('name, phone').eq('id', data.buyer_id).maybeSingle(),
        isAccepted 
          ? supabase.from('driver_profiles').select('name, phone, province, vehicle_type').eq('user_id', data.driver_id).maybeSingle()
          : supabase.from('driver_profiles_public').select('name, province, vehicle_type').eq('user_id', data.driver_id).maybeSingle(),
      ]);

      // Only expose phone for accepted requests
      const safeDriverProfile = driverProfile.data ? {
        ...driverProfile.data,
        phone: isAccepted ? (driverProfile.data as any).phone : undefined,
      } : undefined;

      const safeBuyerProfile = buyerProfile.data ? {
        ...buyerProfile.data,
        phone: isAccepted ? buyerProfile.data.phone : undefined,
      } : undefined;

      setRequest({
        ...data,
        buyer_profile: safeBuyerProfile,
        driver_profile: safeDriverProfile,
      });
    } catch (err) {
      console.error('Error fetching request:', err);
      toast.error('Failed to load request');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!request) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('driver_hire_requests')
        .update({ status: newStatus })
        .eq('id', request.id);

      if (error) throw error;

      // If driver accepts/completes, update availability
      if (role === 'driver' && (newStatus === 'accepted' || newStatus === 'completed')) {
        const isAvailable = newStatus === 'completed';
        await supabase
          .from('driver_profiles')
          .update({ is_available: isAvailable })
          .eq('user_id', user?.id);
      }

      toast.success(`Request ${newStatus}`);
      setRequest({ ...request, status: newStatus });
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error(err.message || 'Failed to update request');
    } finally {
      setUpdating(false);
    }
  };

  const userRole = request?.buyer_id === user?.id ? 'buyer' : 'driver';
  const otherParty = userRole === 'buyer' ? request?.driver_profile : request?.buyer_profile;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getNegotiationBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-xs">Offer Sent</Badge>;
      case 'countered':
        return <Badge className="bg-yellow-500 text-xs">Countered</Badge>;
      case 'agreed':
        return <Badge className="bg-green-500 text-xs">Agreed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!request) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <p>Request not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen py-8">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    Delivery Request
                    {getStatusBadge(request.status)}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    with {otherParty?.name || (userRole === 'buyer' ? 'Driver' : 'Buyer')}
                  </p>
                </div>
              </div>
              {getNegotiationBadge(request.negotiation_status)}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Request Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Delivery Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Pickup</p>
                        <p className="font-medium">{request.pickup_location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-red-600 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Drop-off</p>
                        <p className="font-medium">{request.dropoff_location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Date</p>
                        <p className="font-medium">{format(new Date(request.delivery_date), 'EEEE, MMMM d, yyyy')}</p>
                      </div>
                    </div>
                    {request.delivery_time && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Time</p>
                          <p className="font-medium">{request.delivery_time}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {request.notes && (
                    <div className="bg-muted/50 rounded-lg p-3 mt-4">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{request.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs for Negotiation and Chat */}
              <Tabs defaultValue="chat" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="negotiation">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Negotiation
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="mt-4">
                  <DriverRequestChat requestId={request.id} userRole={userRole} />
                </TabsContent>
                <TabsContent value="negotiation" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      {/* Pricing Summary */}
                      <div className="space-y-3">
                        {request.buyer_offer_amount && (
                          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm text-muted-foreground">Buyer's Offer</span>
                            <span className="font-semibold">${request.buyer_offer_amount.toFixed(2)}</span>
                          </div>
                        )}
                        {request.driver_counter_amount && (
                          <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">Driver's Counter</span>
                            <span className="font-semibold text-orange-600">${request.driver_counter_amount.toFixed(2)}</span>
                          </div>
                        )}
                        {request.final_agreed_amount && (
                          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-500">
                            <span className="text-sm font-medium">Agreed Price</span>
                            <span className="font-bold text-green-600">${request.final_agreed_amount.toFixed(2)}</span>
                          </div>
                        )}
                        {!request.buyer_offer_amount && !request.final_agreed_amount && (
                          <p className="text-center text-muted-foreground py-4">No price negotiation yet</p>
                        )}
                      </div>

                      {request.status === 'pending' && request.negotiation_status !== 'agreed' && (
                        <Button
                          className="w-full mt-4"
                          onClick={() => setNegotiationOpen(true)}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          {userRole === 'buyer' ? 'Make an Offer' : 'Counter Offer'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Contact Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {userRole === 'buyer' ? 'Driver' : 'Buyer'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{otherParty?.name || 'Unknown'}</p>
                  {request.driver_profile && userRole === 'buyer' && (
                    <p className="text-sm text-muted-foreground">
                      {request.driver_profile.province} • {request.driver_profile.vehicle_type}
                    </p>
                  )}
                  {request.status === 'accepted' || request.status === 'completed' ? (
                    otherParty?.phone ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => window.open(`tel:${otherParty.phone}`, '_blank')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    ) : null
                  ) : (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Contact available after request is accepted
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Actions Card */}
              {request.status === 'pending' && userRole === 'driver' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => updateStatus('accepted')}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Accept Request
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => updateStatus('declined')}
                      disabled={updating}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </CardContent>
                </Card>
              )}

              {request.status === 'accepted' && userRole === 'driver' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Delivery Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => updateStatus('completed')}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Mark Completed
                    </Button>
                  </CardContent>
                </Card>
              )}

              {request.status === 'pending' && userRole === 'buyer' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => updateStatus('cancelled')}
                      disabled={updating}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Request
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Request Info */}
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">
                    Requested on {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Negotiation Dialog */}
      <HireNegotiationDialog
        open={negotiationOpen}
        onOpenChange={setNegotiationOpen}
        request={request}
        userRole={userRole}
        onSuccess={fetchRequest}
      />
    </Layout>
  );
};

export default DriverRequestDetail;
