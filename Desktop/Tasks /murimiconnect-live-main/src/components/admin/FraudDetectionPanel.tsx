import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Loader2, RefreshCw, Eye, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface FraudFlag {
  user_id: string;
  risk_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
}

interface FraudScanResult {
  scan_time: string;
  total_flags: number;
  flags: FraudFlag[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-amber-500 text-white',
  low: 'bg-muted text-muted-foreground',
};

const RISK_TYPE_LABELS: Record<string, string> = {
  high_cancellation_rate: 'High Cancellations',
  spam_listings: 'Spam Listings',
  duplicate_listings: 'Duplicate Content',
  unreliable_driver: 'Unreliable Driver',
  suspicious_new_account: 'Suspicious New Account',
};

export const FraudDetectionPanel = () => {
  const [result, setResult] = useState<FraudScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-fraud-detection');
      if (fnError) throw fnError;
      setResult(data);
    } catch (err: any) {
      console.error('Fraud scan error:', err);
      setError(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Fraud Detection</h3>
        </div>
        <Button variant="outline" size="sm" onClick={runScan} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          {loading ? 'Scanning...' : 'Run Scan'}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Summary badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1">
              Total: {result.total_flags}
            </Badge>
            {result.summary.critical > 0 && (
              <Badge className="bg-red-600">Critical: {result.summary.critical}</Badge>
            )}
            {result.summary.high > 0 && (
              <Badge variant="destructive">High: {result.summary.high}</Badge>
            )}
            {result.summary.medium > 0 && (
              <Badge className="bg-amber-500 text-white">Medium: {result.summary.medium}</Badge>
            )}
            {result.summary.low > 0 && (
              <Badge variant="secondary">Low: {result.summary.low}</Badge>
            )}
          </div>

          {/* Flags */}
          {result.flags.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Shield className="h-10 w-10 text-primary mx-auto mb-2" />
                <p className="font-medium text-sm">No suspicious activity detected</p>
                <p className="text-xs text-muted-foreground">Platform is operating normally</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {result.flags.map((flag, i) => (
                <Card key={i} className={flag.risk_level === 'critical' || flag.risk_level === 'high' ? 'border-destructive/30' : ''}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                          flag.risk_level === 'critical' || flag.risk_level === 'high' ? 'text-destructive' : 'text-amber-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-[10px] ${RISK_COLORS[flag.risk_level]}`}>
                              {flag.risk_level}
                            </Badge>
                            <span className="text-xs font-medium">
                              {RISK_TYPE_LABELS[flag.risk_type] || flag.risk_type}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{flag.description}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                            User: {flag.user_id.slice(0, 12)}...
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                        <Link to="/admin/users">
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {result.scan_time && (
            <p className="text-[10px] text-muted-foreground text-right">
              Last scan: {new Date(result.scan_time).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
};