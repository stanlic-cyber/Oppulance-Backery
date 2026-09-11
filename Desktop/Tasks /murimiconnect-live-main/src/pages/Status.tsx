import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type HealthState = 'operational' | 'degraded' | 'down';

interface HealthData {
  database: HealthState;
  edge_functions: HealthState;
  metrics?: {
    active_listings: number;
    orders_24h: number;
    open_disputes: number;
    pending_topups: number;
    pending_withdrawals: number;
  };
  checked_at: string;
}

const StatusBadge = ({ state, label }: { state: HealthState; label: string }) => {
  const config = {
    operational: { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2, text: 'Operational' },
    degraded: { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: AlertCircle, text: 'Degraded' },
    down: { color: 'text-red-700 bg-red-50 border-red-200', icon: AlertCircle, text: 'Down' },
  }[state];
  const Icon = config.icon;
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="font-medium">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {config.text}
      </span>
    </div>
  );
};

export default function Status() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    const result: HealthData = {
      database: 'down',
      edge_functions: 'operational',
      checked_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.rpc('get_platform_health' as any);
      if (!error && data) {
        result.database = 'operational';
        result.metrics = (data as any).metrics;
      }
    } catch {
      result.database = 'down';
    }

    // Probe the health-check edge function
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`;
      const r = await fetch(url, { method: 'GET' });
      result.edge_functions = r.ok ? 'operational' : 'degraded';
    } catch {
      result.edge_functions = 'down';
    }

    setHealth(result);
    setLoading(false);
  };

  useEffect(() => {
    checkHealth();
    const t = setInterval(checkHealth, 60000);
    return () => clearInterval(t);
  }, []);

  const overall: HealthState = !health
    ? 'down'
    : health.database === 'operational' && health.edge_functions === 'operational'
    ? 'operational'
    : health.database === 'down'
    ? 'down'
    : 'degraded';

  const overallText = {
    operational: 'All Systems Operational',
    degraded: 'Partial Service Disruption',
    down: 'Major Outage',
  }[overall];

  const overallColor = {
    operational: 'bg-green-50 text-green-700 border-green-200',
    degraded: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    down: 'bg-red-50 text-red-700 border-red-200',
  }[overall];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Murimi System Status</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Live status of platform services. Refreshes every 60 seconds.
        </p>

        <Card className={`p-6 mb-6 border-2 ${overallColor}`}>
          <div className="flex items-center gap-3">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : overall === 'operational' ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <AlertCircle className="h-6 w-6" />
            )}
            <div>
              <p className="font-semibold">{overallText}</p>
              {health && (
                <p className="text-xs opacity-70">
                  Last checked: {new Date(health.checked_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Components</h2>
          {health && (
            <>
              <StatusBadge state={health.database} label="Database & API" />
              <StatusBadge state={health.edge_functions} label="Edge Functions" />
            </>
          )}
        </Card>

        {health?.metrics && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Live Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-primary">{health.metrics.active_listings}</p>
                <p className="text-xs text-muted-foreground">Active listings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{health.metrics.orders_24h}</p>
                <p className="text-xs text-muted-foreground">Orders (24h)</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{health.metrics.pending_topups}</p>
                <p className="text-xs text-muted-foreground">Pending top-ups</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{health.metrics.pending_withdrawals}</p>
                <p className="text-xs text-muted-foreground">Pending withdrawals</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-2">
          <Button onClick={checkHealth} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Refresh now
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
