import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Loader2, 
  Truck, 
  DollarSign,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HireNegotiationDialog from '@/components/driver/HireNegotiationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  driver_profile?: {
    name: string;
    phone?: string;
    province: string;
    vehicle_type: string;
  };
}

const MyDriverRequests = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<HireRequest | null>(null);
  const [negotiationOpen, setNegotiationOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!authLoading && role !== 'buyer') {
      navigate('/marketplace');
      return;
    }

    if (user) {
      fetchRequests();
    }
  }, [user, authLoading, role, navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_hire_requests')
        .select('*')
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch driver profiles via public view (no phone exposed for privacy)
      if (data && data.length > 0) {
        const driverIds = [...new Set(data.map(r => r.driver_id))];
        const { data: profiles } = await supabase
          .from('driver_profiles_public')
          .select('user_id, name, province, vehicle_type')
          .in('user_id', driverIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const enrichedRequests = data.map(r => ({
          ...r,
          driver_profile: profileMap.get(r.driver_id),
        }));
        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500 hover:bg-green-500">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500 hover:bg-blue-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getNegotiationBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">Offer Sent</Badge>;
      case 'countered':
        return <Badge className="bg-amber-500 hover:bg-amber-500 text-xs">Countered</Badge>;
      case 'agreed':
        return <Badge className="bg-green-500 hover:bg-green-500 text-xs">Agreed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return request.status === 'pending';
    if (activeTab === 'negotiating') return request.negotiation_status === 'countered';
    if (activeTab === 'accepted') return request.status === 'accepted';
    if (activeTab === 'completed') return request.status === 'completed';
    return true;
  });

  const handleNegotiate = (request: HireRequest) => {
    setSelectedRequest(request);
    setNegotiationOpen(true);
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">My Driver Requests</h1>
                <p className="text-muted-foreground text-sm">
                  Track and negotiate delivery requests
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="h-auto flex-wrap gap-1 p-1 bg-muted/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                All <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{requests.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Pending <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{requests.filter(r => r.status === 'pending').length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="negotiating" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Negotiating <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{requests.filter(r => r.negotiation_status === 'countered').length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="accepted" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Accepted <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{requests.filter(r => r.status === 'accepted').length}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Requests List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No requests found</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                  {activeTab === 'all' 
                    ? "You haven't hired any drivers yet"
                    : "No requests match this filter"
                  }
                </p>
                <Button onClick={() => navigate('/hire-driver')}>
                  <Truck className="h-4 w-4 mr-2" />
                  Hire a Driver
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden hover:shadow-md transition-all duration-200 border-border/50">
                  <CardHeader className="pb-3 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {(request.driver_profile?.name || 'D').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {request.driver_profile?.name || 'Driver'}
                            {getStatusBadge(request.status)}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {getNegotiationBadge(request.negotiation_status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {/* Route */}
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="truncate">{request.pickup_location}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <MapPin className="h-4 w-4 text-red-600 shrink-0" />
                        <span className="truncate">{request.dropoff_location}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{format(new Date(request.delivery_date), 'MMM d, yyyy')}</span>
                      </div>
                      {request.delivery_time && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{request.delivery_time}</span>
                        </div>
                      )}
                    </div>

                    {/* Pricing Info */}
                    {(request.buyer_offer_amount || request.driver_counter_amount || request.final_agreed_amount) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-3 bg-muted/50 rounded-lg text-sm">
                        {request.buyer_offer_amount && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">Your offer:</span>
                            <span className="font-semibold">${request.buyer_offer_amount.toFixed(2)}</span>
                          </div>
                        )}
                        {request.driver_counter_amount && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">Counter:</span>
                            <span className="font-semibold text-amber-600">${request.driver_counter_amount.toFixed(2)}</span>
                          </div>
                        )}
                        {request.final_agreed_amount && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">Agreed:</span>
                            <span className="font-bold text-green-600">${request.final_agreed_amount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {request.notes && (
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                        <p className="line-clamp-2">{request.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => navigate(`/driver-request/${request.id}`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1.5" />
                        View Details
                      </Button>
                      {request.status === 'pending' && request.negotiation_status === 'countered' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9"
                          onClick={() => handleNegotiate(request)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Respond
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Negotiation Dialog */}
      {selectedRequest && (
        <HireNegotiationDialog
          open={negotiationOpen}
          onOpenChange={setNegotiationOpen}
          request={selectedRequest}
          userRole="buyer"
          onSuccess={fetchRequests}
        />
      )}
    </Layout>
  );
};

export default MyDriverRequests;