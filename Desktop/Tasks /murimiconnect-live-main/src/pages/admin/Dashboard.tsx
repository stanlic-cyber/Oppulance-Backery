import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, ShoppingBasket, Ticket, TrendingUp, DollarSign, ArrowUpRight, Truck } from 'lucide-react';
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts';
import { AIBusinessInsights } from '@/components/admin/AIBusinessInsights';
import { FraudDetectionPanel } from '@/components/admin/FraudDetectionPanel';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalUsers: number;
  totalListings: number;
  totalOrders: number;
  openTickets: number;
  activeListings: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'listing' | 'order' | 'ticket';
  title: string;
  time: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalListings: 0,
    totalOrders: 0,
    openTickets: 0,
    activeListings: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all counts in parallel
      const [
        { count: usersCount },
        { count: listingsCount },
        { count: activeListingsCount },
        { count: ordersCount },
        { count: completedOrdersCount },
        { count: pendingOrdersCount },
        { count: openTicketsCount },
        { data: recentUsers },
        { data: recentListings },
        { data: recentOrders },
        { data: completedOrdersData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('profiles').select('id, name, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('listings').select('id, title, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('orders').select('id, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('orders').select('quantity, offered_price').eq('status', 'completed'),
      ]);

      // Calculate revenue
      const revenue = (completedOrdersData || []).reduce((sum, order) => 
        sum + (order.quantity * order.offered_price), 0);

      setStats({
        totalUsers: usersCount || 0,
        totalListings: listingsCount || 0,
        activeListings: activeListingsCount || 0,
        totalOrders: ordersCount || 0,
        completedOrders: completedOrdersCount || 0,
        pendingOrders: pendingOrdersCount || 0,
        openTickets: openTicketsCount || 0,
        totalRevenue: revenue,
      });

      // Build recent activity
      const activities: RecentActivity[] = [];
      
      (recentUsers || []).forEach(u => {
        activities.push({
          id: u.id,
          type: 'user',
          title: `New user: ${u.name}`,
          time: u.created_at,
        });
      });

      (recentListings || []).forEach(l => {
        activities.push({
          id: l.id,
          type: 'listing',
          title: `New listing: ${l.title}`,
          time: l.created_at,
        });
      });

      (recentOrders || []).forEach(o => {
        activities.push({
          id: o.id,
          type: 'order',
          title: `New order placed`,
          time: o.created_at,
        });
      });

      // Sort by time
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 8));

    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', link: '/admin/users' },
    { title: 'Active Listings', value: stats.activeListings, icon: Package, color: 'text-green-600', link: '/admin/listings' },
    { title: 'Pending Orders', value: stats.pendingOrders, icon: ShoppingBasket, color: 'text-orange-600', link: '/admin/orders' },
    { title: 'Open Tickets', value: stats.openTickets, icon: Ticket, color: 'text-red-600', link: '/admin/tickets' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? '...' : stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Listings
            </CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalListings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeListings} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedOrders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue (Est.)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `$${stats.totalRevenue.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From completed orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI-Powered Tabs */}
      <Tabs defaultValue="insights" className="mt-6">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
          <TabsTrigger value="charts">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <AIBusinessInsights />
        </TabsContent>

        <TabsContent value="fraud">
          <FraudDetectionPanel />
        </TabsContent>

        <TabsContent value="charts">
          <AnalyticsCharts />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'user' ? 'bg-blue-500' :
                        activity.type === 'listing' ? 'bg-green-500' :
                        activity.type === 'order' ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(activity.time)}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default Dashboard;