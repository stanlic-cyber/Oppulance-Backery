import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorAnalytics } from '@/components/seller/VendorAnalytics';
import { PageHeader } from '@/components/ui/page-transition';
import { 
  Package, 
  ShoppingBasket, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

// Safe number formatter to prevent .toFixed() crashes on undefined/null values
const formatMoney = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0.00';
  const num = Number(value);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

interface DashboardStats {
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

interface RecentOrder {
  id: string;
  listing_title: string;
  buyer_name: string;
  quantity: number;
  unit: string;
  total_price: number;
  status: string;
  created_at: string;
}

interface RecentListing {
  id: string;
  title: string;
  category: string;
  price_per_unit: number;
  unit: string;
  quantity: number;
  status: string;
  created_at: string;
  photos: string[];
}

const SellerDashboard = () => {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    activeListings: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);

  useEffect(() => {
    if (user && role === 'farmer') {
      fetchDashboardData();
    }
  }, [user, role]);

  const fetchDashboardData = async () => {
    try {
      // Fetch listings
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('farmer_id', user?.id)
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;

      const activeListings = listings?.filter(l => l.status === 'active') || [];
      setRecentListings((listings?.slice(0, 5) as RecentListing[]) || []);

      // Fetch orders for this farmer's listings
      const listingIds = listings?.map(l => l.id) || [];
      
      let ordersData: any[] = [];
      const enrichedOrders: RecentOrder[] = [];

      if (listingIds.length > 0) {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        ordersData = orders || [];

        // Enrich orders with listing and buyer info
        for (const order of ordersData.slice(0, 5)) {
          const listing = listings?.find(l => l.id === order.listing_id);
          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', order.buyer_id)
            .maybeSingle();

          enrichedOrders.push({
            id: order.id,
            listing_title: listing?.title || 'Unknown',
            buyer_name: buyerProfile?.name || 'Buyer',
            quantity: order.quantity,
            unit: listing?.unit || 'kg',
            total_price: order.total_amount || (order.quantity * order.offered_price) || 0,
            status: order.status,
            created_at: order.created_at,
          });
        }
      }

      setRecentOrders(enrichedOrders);

      // Calculate stats
      const pendingOrders = ordersData.filter(o => 
        ['pending', 'negotiating'].includes(o.status)
      ).length;
      const completedOrders = ordersData.filter(o => o.status === 'completed').length;
      const totalRevenue = ordersData
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total_amount || (o.quantity * o.offered_price) || 0), 0);

      setStats({
        totalListings: listings?.length || 0,
        activeListings: activeListings.length,
        totalOrders: ordersData.length,
        pendingOrders,
        completedOrders,
        totalRevenue,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted':
      case 'confirmed':
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (role !== 'farmer') {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Farmers Only</h1>
          <p className="text-muted-foreground">This dashboard is for farmers to manage their sales.</p>
          <Button asChild className="mt-4">
            <Link to="/marketplace">Go to Marketplace</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
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
      <PageHeader 
        title="Seller Dashboard" 
        backTo="/"
        action={
          <Button size="sm" asChild className="rounded-xl h-8">
            <Link to="/sell"><Plus className="h-3.5 w-3.5 mr-1" />New</Link>
          </Button>
        }
      />
      <div className="bg-muted/30 min-h-screen pb-24 md:pb-8">
        <div className="container py-4 md:py-6">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Listings</p>
                    <p className="text-2xl font-bold">{stats.activeListings}</p>
                    <p className="text-xs text-muted-foreground">{stats.totalListings} total</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Orders</p>
                    <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                    <p className="text-xs text-muted-foreground">{stats.totalOrders} total</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{stats.completedOrders}</p>
                    <p className="text-xs text-muted-foreground">orders</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${formatMoney(stats.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">from sales</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link to="/my-listings">
                <Package className="h-5 w-5" />
                <span>My Listings</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link to="/my-orders">
                <ShoppingBasket className="h-5 w-5" />
                <span>Orders Received</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link to="/sell">
                <Plus className="h-5 w-5" />
                <span>Create Listing</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link to="/settings/profile">
                <BarChart3 className="h-5 w-5" />
                <span>Edit Profile</span>
              </Link>
            </Button>
          </div>

          {/* Recent Activity */}
          <Tabs defaultValue="analytics" className="space-y-4">
            <TabsList>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="orders">Recent Orders</TabsTrigger>
              <TabsTrigger value="listings">My Listings</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <VendorAnalytics />
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/my-orders">
                      View All <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBasket className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No orders yet</p>
                      <p className="text-sm">Orders will appear here when buyers purchase your produce</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{order.listing_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.buyer_name} • {order.quantity} {order.unit}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="font-semibold">${formatMoney(order.total_price)}</p>
                              {getStatusBadge(order.status)}
                            </div>
                            <Button variant="ghost" size="icon" asChild>
                              <Link to="/my-orders">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="listings">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">My Listings</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/my-listings">
                      View All <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentListings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No listings yet</p>
                      <Button asChild className="mt-4">
                        <Link to="/sell">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Listing
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentListings.map(listing => (
                        <div key={listing.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {listing.photos?.[0] ? (
                              <img 
                                src={listing.photos[0]} 
                                alt={listing.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{listing.title}</p>
                            <p className="text-sm text-muted-foreground">
                              ${listing.price_per_unit}/{listing.unit} • {listing.quantity} available
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                              {listing.status}
                            </Badge>
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/listing/${listing.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
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

export default SellerDashboard;
