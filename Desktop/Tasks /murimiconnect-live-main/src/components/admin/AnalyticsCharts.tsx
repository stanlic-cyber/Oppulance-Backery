import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface OrderTrend {
  month: string;
  orders: number;
  revenue: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
}

interface UserGrowth {
  month: string;
  users: number;
}

const COLORS = [
  'hsl(142, 72%, 37%)', 'hsl(38, 92%, 50%)', 'hsl(224, 76%, 48%)',
  'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)', 'hsl(180, 60%, 40%)',
  'hsl(60, 80%, 45%)', 'hsl(320, 60%, 50%)', 'hsl(200, 70%, 45%)', 'hsl(100, 50%, 40%)',
];

export function AnalyticsCharts() {
  const [orderTrends, setOrderTrends] = useState<OrderTrend[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [
        { data: orders },
        { data: listings },
        { data: profiles },
      ] = await Promise.all([
        supabase.from('orders').select('created_at, quantity, offered_price, status'),
        supabase.from('listings').select('category, created_at'),
        supabase.from('profiles').select('created_at'),
      ]);

      // Order trends by month (last 6 months)
      const monthMap = new Map<string, { orders: number; revenue: number }>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
        monthMap.set(key, { orders: 0, revenue: 0 });
      }

      (orders || []).forEach((o) => {
        const d = new Date(o.created_at!);
        const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
        if (monthMap.has(key)) {
          const entry = monthMap.get(key)!;
          entry.orders += 1;
          if (o.status === 'completed') {
            entry.revenue += (o.quantity || 0) * (o.offered_price || 0);
          }
        }
      });

      setOrderTrends(
        Array.from(monthMap.entries()).map(([month, data]) => ({
          month,
          orders: data.orders,
          revenue: Math.round(data.revenue),
        }))
      );

      // Category breakdown
      const catCount = new Map<string, number>();
      (listings || []).forEach((l) => {
        catCount.set(l.category, (catCount.get(l.category) || 0) + 1);
      });
      setCategoryBreakdown(
        Array.from(catCount.entries())
          .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
          .sort((a, b) => b.value - a.value)
      );

      // User growth by month
      const userMonthMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
        userMonthMap.set(key, 0);
      }

      (profiles || []).forEach((p) => {
        if (!p.created_at) return;
        const d = new Date(p.created_at);
        const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
        if (userMonthMap.has(key)) {
          userMonthMap.set(key, (userMonthMap.get(key) || 0) + 1);
        }
      });

      setUserGrowth(
        Array.from(userMonthMap.entries()).map(([month, users]) => ({ month, users }))
      );
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className={i === 1 ? 'lg:col-span-2' : ''}>
            <CardContent className="h-72 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue & Orders Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Orders & Revenue (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orderTrends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="orders" fill="hsl(142, 72%, 37%)" name="Orders" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" fill="hsl(38, 92%, 50%)" name="Revenue ($)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listings by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No listing data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryBreakdown.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* User Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Signups (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="hsl(224, 76%, 48%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(224, 76%, 48%)', r: 4 }}
                name="New Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
