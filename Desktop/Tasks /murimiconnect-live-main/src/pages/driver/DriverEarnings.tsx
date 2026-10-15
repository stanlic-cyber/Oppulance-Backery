import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, Truck, Star, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface EarningsData {
  totalEarnings: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  totalDeliveries: number;
  completedDeliveries: number;
  averageRating: number | null;
  ratingCount: number;
}

interface CompletedDelivery {
  id: string;
  cargo_type: string;
  pickup_province: string;
  dropoff_province: string;
  agreed_price: number | null;
  created_at: string;
  status: string;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const DriverEarnings = () => {
  const { user, role, driverProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [deliveries, setDeliveries] = useState<CompletedDelivery[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    if (role !== 'driver') {
      navigate('/marketplace');
      return;
    }
    fetchEarningsData();
  }, [user, role]);

  const fetchEarningsData = async () => {
    if (!user) return;

    try {
      // Fetch completed deliveries
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('assigned_driver_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (deliveryError) throw deliveryError;
      setDeliveries(deliveryData || []);

      // Calculate earnings
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const monthStart = startOfMonth(now);

      const totalEarnings = deliveryData?.reduce((sum, d) => sum + (d.agreed_price || 0), 0) || 0;
      const weeklyEarnings = deliveryData
        ?.filter(d => new Date(d.created_at) >= weekAgo)
        .reduce((sum, d) => sum + (d.agreed_price || 0), 0) || 0;
      const monthlyEarnings = deliveryData
        ?.filter(d => new Date(d.created_at) >= monthStart)
        .reduce((sum, d) => sum + (d.agreed_price || 0), 0) || 0;

      // Fetch ratings
      const { data: ratingData, error: ratingError } = await supabase
        .from('delivery_ratings')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

      if (ratingError) throw ratingError;
      setRatings(ratingData || []);

      // Calculate average rating
      const avgRating = ratingData && ratingData.length > 0
        ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length
        : null;

      // Fetch all deliveries for count
      const { count: totalCount } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_driver_id', user.id);

      setEarnings({
        totalEarnings,
        monthlyEarnings,
        weeklyEarnings,
        totalDeliveries: totalCount || 0,
        completedDeliveries: deliveryData?.length || 0,
        averageRating: avgRating,
        ratingCount: ratingData?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching earnings:', err);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  // Filter deliveries by period
  const filteredDeliveries = deliveries.filter(d => {
    if (period === 'all') return true;
    const date = new Date(d.created_at);
    if (period === 'week') return date >= subDays(new Date(), 7);
    if (period === 'month') return date >= startOfMonth(new Date());
    return true;
  });

  const periodEarnings = filteredDeliveries.reduce((sum, d) => sum + (d.agreed_price || 0), 0);

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
      <div className="bg-muted/30 min-h-screen">
        <div className="container py-6 md:py-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/driver')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Earnings Dashboard
              </h1>
              <p className="text-muted-foreground">Track your delivery income and performance</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Earnings</CardDescription>
                <CardTitle className="text-2xl text-primary flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {earnings?.totalEarnings.toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>This Month</CardDescription>
                <CardTitle className="text-2xl text-green-600 flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {earnings?.monthlyEarnings.toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-1">
                  <Truck className="h-5 w-5 text-blue-500" />
                  {earnings?.completedDeliveries}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  of {earnings?.totalDeliveries} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Rating</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  {earnings?.averageRating ? earnings.averageRating.toFixed(1) : 'N/A'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {earnings?.ratingCount} reviews
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="history" className="space-y-4">
            <TabsList>
              <TabsTrigger value="history">Delivery History</TabsTrigger>
              <TabsTrigger value="ratings">Ratings & Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg">Completed Deliveries</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={period === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('week')}
                      >
                        Week
                      </Button>
                      <Button
                        variant={period === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('month')}
                      >
                        Month
                      </Button>
                      <Button
                        variant={period === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('all')}
                      >
                        All
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {filteredDeliveries.length} deliveries • ${periodEarnings.toFixed(2)} earned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredDeliveries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No completed deliveries in this period
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredDeliveries.map(delivery => (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                              📦
                            </div>
                            <div>
                              <p className="font-medium">{delivery.cargo_type}</p>
                              <p className="text-sm text-muted-foreground">
                                {delivery.pickup_province} → {delivery.dropoff_province}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(delivery.created_at), 'dd MMM yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              ${delivery.agreed_price?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ratings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Reviews</CardTitle>
                  <CardDescription>
                    {ratings.length} reviews • Average: {earnings?.averageRating?.toFixed(1) || 'N/A'} ⭐
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ratings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No reviews yet. Complete more deliveries to get feedback!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {ratings.map(rating => (
                        <div key={rating.id} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= rating.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-muted-foreground/30'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(rating.created_at), 'dd MMM yyyy')}
                            </span>
                          </div>
                          {rating.comment && (
                            <p className="text-sm text-muted-foreground">"{rating.comment}"</p>
                          )}
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

export default DriverEarnings;