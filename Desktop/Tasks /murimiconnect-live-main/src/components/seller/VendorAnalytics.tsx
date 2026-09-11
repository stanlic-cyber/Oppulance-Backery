import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, Users, ShoppingBasket, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OrderData {
  id: string;
  quantity: number;
  offered_price: number;
  total_amount: number | null;
  status: string;
  created_at: string;
  listing_id: string;
  buyer_id: string;
}

interface ListingData {
  id: string;
  title: string;
  category: string;
  price_per_unit: number;
  unit: string;
}

const COLORS = ['hsl(var(--primary))', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export const VendorAnalytics = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, category, price_per_unit, unit')
        .eq('farmer_id', user!.id);

      setListings(listingsData || []);

      const listingIds = (listingsData || []).map(l => l.id);
      if (listingIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, quantity, offered_price, total_amount, status, created_at, listing_id, buyer_id')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: true });

        setOrders(ordersData || []);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Revenue by day (last 30 days)
  const revenueByDay = useMemo(() => {
    const completed = orders.filter(o => o.status === 'completed');
    const days = new Map<string, number>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.set(d.toISOString().split('T')[0], 0);
    }
    completed.forEach(o => {
      const day = o.created_at.split('T')[0];
      if (days.has(day)) {
        days.set(day, (days.get(day) || 0) + (o.total_amount || o.quantity * o.offered_price));
      }
    });
    return Array.from(days.entries()).map(([date, revenue]) => ({
      date: date.slice(5), // MM-DD
      revenue: Math.round(revenue * 100) / 100,
    }));
  }, [orders]);

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach(o => counts.set(o.status, (counts.get(o.status) || 0) + 1));
    return Array.from(counts.entries()).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  }, [orders]);

  // Top products by revenue
  const topProducts = useMemo(() => {
    const productRevenue = new Map<string, number>();
    const completed = orders.filter(o => o.status === 'completed');
    completed.forEach(o => {
      const listing = listings.find(l => l.id === o.listing_id);
      const name = listing?.title || 'Unknown';
      productRevenue.set(name, (productRevenue.get(name) || 0) + (o.total_amount || o.quantity * o.offered_price));
    });
    return Array.from(productRevenue.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, revenue]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, revenue: Math.round(revenue * 100) / 100 }));
  }, [orders, listings]);

  // Unique customers
  const uniqueCustomers = useMemo(() => {
    return new Set(orders.map(o => o.buyer_id)).size;
  }, [orders]);

  // Repeat customer rate
  const repeatRate = useMemo(() => {
    const buyerCounts = new Map<string, number>();
    orders.forEach(o => buyerCounts.set(o.buyer_id, (buyerCounts.get(o.buyer_id) || 0) + 1));
    const repeats = Array.from(buyerCounts.values()).filter(c => c > 1).length;
    const total = buyerCounts.size;
    return total > 0 ? Math.round((repeats / total) * 100) : 0;
  }, [orders]);

  // Completion rate
  const completionRate = useMemo(() => {
    if (orders.length === 0) return 0;
    const completed = orders.filter(o => o.status === 'completed').length;
    return Math.round((completed / orders.length) * 100);
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.total_amount || o.quantity * o.offered_price), 0);
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-xl font-bold mt-1">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Customers</span>
            </div>
            <p className="text-xl font-bold mt-1">{uniqueCustomers}</p>
            <p className="text-[10px] text-muted-foreground">{repeatRate}% repeat</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBasket className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Total Orders</span>
            </div>
            <p className="text-xl font-bold mt-1">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Completion</span>
            </div>
            <p className="text-xl font-bold mt-1">{completionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="flex-wrap">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="orders">Order Status</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Revenue (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No completed orders yet</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersByStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No orders yet</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {ordersByStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
