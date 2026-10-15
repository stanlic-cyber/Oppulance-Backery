import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Loader2,
  Lightbulb, RefreshCw, DollarSign, Users, ShoppingBasket, Truck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  impact: string;
}

interface Metrics {
  totalUsers: number;
  uniqueSellers: number;
  orderCount: number;
  completedCount: number;
  cancelledCount: number;
  completionRate: number;
  cancellationRate: number;
  totalRevenue: number;
  deliveryCount: number;
  deliverySuccessRate: number;
  weeklyGrowth: number;
  topCategories: [string, number][];
  topProvinces: [string, number][];
}

interface InsightsData {
  metrics: Metrics;
  insights: Insight[];
  recommendations: Recommendation[];
  summary?: string;
}

const INSIGHT_ICONS: Record<string, any> = {
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
};

const INSIGHT_COLORS: Record<string, string> = {
  success: 'text-primary bg-primary/10',
  warning: 'text-amber-600 bg-amber-50',
  danger: 'text-destructive bg-destructive/10',
  info: 'text-blue-600 bg-blue-50',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-muted text-muted-foreground border-border',
};

export const AIBusinessInsights = () => {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('ai-business-insights');
      if (fnError) throw fnError;
      setData(result);
    } catch (err: any) {
      console.error('Business insights error:', err);
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Analyzing platform data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchInsights}>
            <RefreshCw className="h-3 w-3 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { metrics, insights, recommendations, summary } = data;

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm mb-1">AI Executive Summary</p>
                <p className="text-sm text-muted-foreground">{summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Revenue (30d)</span>
            </div>
            <p className="text-xl font-bold">${metrics.totalRevenue.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBasket className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Orders (30d)</span>
            </div>
            <p className="text-xl font-bold">{metrics.orderCount}</p>
            <p className="text-[10px] text-muted-foreground">{metrics.completionRate}% completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Users</span>
            </div>
            <p className="text-xl font-bold">{metrics.totalUsers}</p>
            <p className="text-[10px] text-muted-foreground">{metrics.uniqueSellers} sellers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {metrics.weeklyGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-primary" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className="text-xs text-muted-foreground">Weekly Trend</span>
            </div>
            <p className="text-xl font-bold">
              {metrics.weeklyGrowth >= 0 ? '+' : ''}{metrics.weeklyGrowth}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights && insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                AI Insights
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchInsights}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, i) => {
              const Icon = INSIGHT_ICONS[insight.type] || Info;
              const colorClass = INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.info;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${PRIORITY_COLORS[rec.priority] || ''}`}>
                  {rec.priority}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{rec.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.impact}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};