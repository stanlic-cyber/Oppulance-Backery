import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, Check, X, Loader2, DollarSign, MessageSquare, CheckCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import HireNegotiationDialog from '@/components/driver/HireNegotiationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLockedCheck } from '@/hooks/useLockedCheck';
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
}

const DriverHireRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAccountRestricted, checkLocked } = useLockedCheck();
  const [requests, setRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<HireRequest | null>(null);
  const [negotiationOpen, setNegotiationOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_hire_requests')
        .select('*')
        .eq('driver_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch buyer profiles using safe public view (no phone exposed by default)
      if (data && data.length > 0) {
        const buyerIds = [...new Set(data.map(r => r.buyer_id))];
        // Use profiles_public for safety - phone is fetched separately only when needed
        const { data: profiles } = await supabase
          .from('profiles_public' as any)
          .select('id, name')
          .in('id', buyerIds) as { data: { id: string; name: string }[] | null };

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        
        // For accepted/completed requests, fetch phone from full profiles table (will be restricted by RLS)
        const acceptedBuyerIds = data.filter(r => r.status === 'accepted' || r.status === 'completed').map(r => r.buyer_id);
        let phoneMap = new Map<string, string>();
        if (acceptedBuyerIds.length > 0) {
          const { data: phoneData } = await supabase
            .from('profiles')
            .select('id, phone')
            .in('id', acceptedBuyerIds) as { data: { id: string; phone: string | null }[] | null };
          phoneMap = new Map((phoneData || []).map(p => [p.id, p.phone || '']));
        }
        
        const enrichedRequests = data.map(r => {
          const profile = profileMap.get(r.buyer_id);
          const phone = (r.status === 'accepted' || r.status === 'completed') ? phoneMap.get(r.buyer_id) : undefined;
          const safeProfile = profile ? {
            name: profile.name,
            phone,
          } : undefined;
          return {
            ...r,
            buyer_profile: safeProfile,
          };
        });
        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Error fetching hire requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'accepted' | 'declined' | 'completed') => {
    // Check if driver is locked when trying to accept
    if (status === 'accepted' && checkLocked('accept hire requests')) {
      return;
    }

    setUpdatingId(requestId);
    try {
      const { error } = await supabase
        .from('driver_hire_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      // Update driver availability based on status
      if (status === 'accepted') {
        await supabase
          .from('driver_profiles')
          .update({ is_available: false })
          .eq('user_id', user?.id);
      } else if (status === 'completed') {
        await supabase
          .from('driver_profiles')
          .update({ is_available: true })
          .eq('user_id', user?.id);
      }

      toast.success(`Request ${status}`);
      fetchRequests();
    } catch (err: any) {
      console.error('Error updating request:', err);
      toast.error(err.message || 'Failed to update request');
    } finally {
      setUpdatingId(null);
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
        return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">Has Offer</Badge>;
      case 'countered':
        return <Badge className="bg-amber-500 hover:bg-amber-500 text-xs">You Countered</Badge>;
      case 'agreed':
        return <Badge className="bg-green-500 hover:bg-green-500 text-xs">Agreed</Badge>;
      default:
        return null;
    }
  };

  const handleNegotiate = (request: HireRequest) => {
    setSelectedRequest(request);
    setNegotiationOpen(true);
  };

  const filteredRequests = requests.filter(request => {
    if (activeTab === 'pending') return request.status === 'pending';
    if (activeTab === 'accepted') return request.status === 'accepted';
    if (activeTab === 'completed') return request.status === 'completed';
    if (activeTab === 'declined') return request.status === 'declined' || request.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lock Warning for Drivers */}
      {isAccountRestricted && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Your account is restricted. You cannot accept new hire requests until your platform fees are paid.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 h-auto flex-wrap gap-1 p-1 bg-muted/50">
          <TabsTrigger value="pending" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Pending <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{requests.filter(r => r.status === 'pending').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="accepted" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Accepted <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{requests.filter(r => r.status === 'accepted').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Completed <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{requests.filter(r => r.status === 'completed').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="declined" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Declined <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{requests.filter(r => r.status === 'declined' || r.status === 'cancelled').length}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredRequests.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No {activeTab} hire requests
            </p>
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
                        {(request.buyer_profile?.name || 'B').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {request.buyer_profile?.name || 'Unknown Buyer'}
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
                        <span className="text-muted-foreground text-xs">Buyer offer:</span>
                        <span className="font-semibold">${request.buyer_offer_amount.toFixed(2)}</span>
                      </div>
                    )}
                    {request.driver_counter_amount && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">Your counter:</span>
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
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={() => navigate(`/driver-request/${request.id}`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    Details & Chat
                  </Button>

                  {request.status === 'pending' && (
                    <>
                      {/* Show negotiate button if there's an offer */}
                      {request.buyer_offer_amount && request.negotiation_status !== 'agreed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9"
                          onClick={() => handleNegotiate(request)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          {request.negotiation_status === 'countered' ? 'View Offer' : 'Respond'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="flex-1 h-9 bg-green-600 hover:bg-green-700"
                        onClick={() => updateRequestStatus(request.id, 'accepted')}
                        disabled={updatingId === request.id}
                      >
                        {updatingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        onClick={() => updateRequestStatus(request.id, 'declined')}
                        disabled={updatingId === request.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </>
                  )}

                  {request.status === 'accepted' && (
                    <Button
                      size="sm"
                      className="h-9 bg-blue-600 hover:bg-blue-700"
                      onClick={() => updateRequestStatus(request.id, 'completed')}
                      disabled={updatingId === request.id}
                    >
                      {updatingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Completed
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Negotiation Dialog */}
      {selectedRequest && (
        <HireNegotiationDialog
          open={negotiationOpen}
          onOpenChange={setNegotiationOpen}
          request={selectedRequest}
          userRole="driver"
          onSuccess={fetchRequests}
        />
      )}
    </div>
  );
};

export default DriverHireRequests;