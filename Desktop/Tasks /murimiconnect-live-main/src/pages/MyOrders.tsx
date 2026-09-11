import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBasket, Loader2, MessageSquare, Filter, TrendingUp, Clock, CheckCircle2, Package } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NegotiationDialog } from '@/components/orders/NegotiationDialog';
import { OrderCard } from '@/components/orders/OrderCard';
import { formatCurrency } from '@/lib/platformFee';
import { OrderStatus } from '@/lib/orderStatus';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface Order {
  id: string;
  quantity: number;
  offered_price: number;
  status: OrderStatus;
  created_at: string;
  listing_id: string;
  buyer_id: string;
  subtotal?: number;
  platform_fee_percent?: number;
  platform_fee_amount?: number;
  total_amount?: number;
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

interface OrderWithDetails extends Order {
  listing_title: string;
  listing_unit: string;
  listing_photos: string[];
  farmer_id: string;
  farmer_name: string;
  buyer_name: string;
  unread_count: number;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
];

const MyOrders = () => {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, role]);

  const fetchOrders = async () => {
    try {
      if (!user?.id) {
        toast.error('Not authenticated');
        setLoading(false);
        return;
      }

      // ✅ FIX IDOR-001: Filter by buyer_id to show only user's own orders
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (role === 'farmer') {
        const { data: farmerListings, error: listingsError } = await supabase
          .from('listings')
          .select('id')
          .eq('farmer_id', user.id);

        if (listingsError) throw listingsError;

        const listingIds = farmerListings?.map((listing) => listing.id) ?? [];
        if (listingIds.length === 0) {
          setOrders([]);
          return;
        }

        ordersQuery = ordersQuery.in('listing_id', listingIds);
      } else {
        ordersQuery = ordersQuery.eq('buyer_id', user.id);
      }

      const { data: ordersData, error } = await ordersQuery;

      if (error) throw error;

      // Filter and enrich orders
      const enrichedOrders: OrderWithDetails[] = [];
      
      for (const order of ordersData || []) {
        const { data: listing } = await supabase
          .from('listings')
          .select('title, unit, photos, farmer_id')
          .eq('id', order.listing_id)
          .maybeSingle();

        if (!listing) continue;

        const isBuyerOrder = order.buyer_id === user?.id;
        const isFarmerOrder = listing.farmer_id === user?.id;

        if ((role === 'buyer' && isBuyerOrder) || (role === 'farmer' && isFarmerOrder)) {
          const { data: farmerProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', listing.farmer_id)
            .maybeSingle();

          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', order.buyer_id)
            .maybeSingle();

          // Get unread message count
          let unreadCount = 0;
          if (user) {
            const { data: countData } = await supabase.rpc('get_unread_message_count', {
              p_order_id: order.id,
              p_user_id: user.id
            });
            unreadCount = countData || 0;
          }

          enrichedOrders.push({
            ...order,
            status: order.status as OrderStatus,
            listing_title: listing.title,
            listing_unit: listing.unit,
            listing_photos: listing.photos || [],
            farmer_id: listing.farmer_id,
            farmer_name: farmerProfile?.name || 'Farmer',
            buyer_name: buyerProfile?.name || 'Buyer',
            unread_count: unreadCount,
          });
        }
      }

      setOrders(enrichedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ['accepted', 'confirmed', 'ready_for_delivery'].includes(order.status);
    return order.status === statusFilter;
  });

  const isFarmerView = role === 'farmer';

  // Calculate stats
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const activeCount = orders.filter(o => ['accepted', 'confirmed', 'ready_for_delivery'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.total_amount || o.quantity * o.offered_price), 0);
  const pendingRevenue = orders
    .filter(o => ['pending', 'accepted', 'confirmed', 'ready_for_delivery'].includes(o.status))
    .reduce((sum, o) => sum + (o.total_amount || o.quantity * o.offered_price), 0);

  return (
    <Layout>
      <PageHeader 
        title={isFarmerView ? 'Orders Received' : t('nav.orders')} 
        backTo="/"
      />
      <div className="bg-muted/30 min-h-screen pb-24 md:pb-8">
        <div className="container py-4 md:py-6">
          {/* Quick Stats */}
          <div className="mb-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              
              {/* Quick Stats */}
              {orders.length > 0 && (
                <div className="flex gap-4">
                  <div className="bg-card border border-border/50 rounded-xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>Completed</span>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${formatCurrency(totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>In Progress</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      ${formatCurrency(pendingRevenue)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Filter Tabs - Desktop */}
          {isFarmerView && orders.length > 0 && (
            <div className="hidden md:block mb-6">
              <Tabs defaultValue="all" onValueChange={setStatusFilter}>
                <TabsList className="bg-card border border-border/50 p-1 h-auto">
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">
                    <Package className="h-4 w-4 mr-2" />
                    All ({orders.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white px-4 py-2">
                    <Clock className="h-4 w-4 mr-2" />
                    Pending ({pendingCount})
                  </TabsTrigger>
                  <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Active ({activeCount})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-green-500 data-[state=active]:text-white px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Done ({completedCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Mobile filter */}
          <div className="md:hidden mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-card border-border/50">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border/50 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <ShoppingBasket className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {isFarmerView 
                  ? 'When buyers place orders for your listings, they will appear here' 
                  : 'Explore the marketplace to discover fresh produce from local farmers'}
              </p>
              {role === 'buyer' && (
                <Button asChild size="lg" className="shadow-md">
                  <Link to="/marketplace">
                    <Package className="h-5 w-5 mr-2" />
                    Browse Marketplace
                  </Link>
                </Button>
              )}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border/50 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Filter className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No orders match this filter</h3>
              <p className="text-muted-foreground mb-6">
                Try selecting a different status to see more orders
              </p>
              <Button variant="outline" onClick={() => setStatusFilter('all')}>
                Show All Orders
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isFarmer={isFarmerView}
                  onOpenChat={() => setSelectedOrder(order)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <NegotiationDialog
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          order={{
            id: selectedOrder.id,
            quantity: selectedOrder.quantity,
            offered_price: selectedOrder.offered_price,
            status: selectedOrder.status,
            buyer_id: selectedOrder.buyer_id,
            listings: {
              title: selectedOrder.listing_title,
              unit: selectedOrder.listing_unit,
              farmer_id: selectedOrder.farmer_id,
            },
          }}
          onStatusChange={(status) => {
            handleStatusChange(selectedOrder.id, status as OrderStatus);
          }}
          onMessagesRead={() => {
            setOrders(prev => prev.map(o => 
              o.id === selectedOrder.id ? { ...o, unread_count: 0 } : o
            ));
          }}
        />
      )}
    </Layout>
  );
};

export default MyOrders;
