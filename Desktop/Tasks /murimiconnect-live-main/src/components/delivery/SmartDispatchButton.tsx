import { useState } from 'react';
import { Zap, Loader2, MapPin, Star, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DriverSuggestion {
  driver_id: string;
  name: string;
  province: string;
  vehicle_type: string;
  distance_km: number;
  rating: number;
  total_deliveries: number;
  score: number;
  has_gps: boolean;
  eta_minutes: number;
}

interface SmartDispatchButtonProps {
  deliveryRequestId: string;
  onDispatched?: () => void;
}

export const SmartDispatchButton = ({ deliveryRequestId, onDispatched }: SmartDispatchButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DriverSuggestion[] | null>(null);
  const [notifiedCount, setNotifiedCount] = useState(0);

  const handleDispatch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-dispatch', {
        body: { delivery_request_id: deliveryRequestId },
      });

      if (error) throw error;

      if (!data.dispatched) {
        toast.info(data.reason || 'No drivers available right now');
        return;
      }

      setSuggestions(data.suggestions);
      setNotifiedCount(data.notified_count);
      toast.success(`${data.notified_count} nearby driver(s) notified!`);
      onDispatched?.();
    } catch (err: any) {
      console.error('Smart dispatch error:', err);
      toast.error(err.message || 'Failed to find drivers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleDispatch}
        disabled={loading}
        className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Finding best drivers...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Smart Auto-Dispatch
          </>
        )}
      </Button>

      {suggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Top {suggestions.length} Matched Drivers
              {notifiedCount > 0 && (
                <Badge variant="secondary" className="text-xs">{notifiedCount} notified</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((driver, i) => (
              <div
                key={driver.driver_id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{driver.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {driver.distance_km}km
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-amber-500" />
                        {driver.rating.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Truck className="h-3 w-3" />
                        {driver.total_deliveries}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={i === 0 ? 'default' : 'outline'} className="text-xs">
                    {driver.score}% match
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    ~{driver.eta_minutes}min ETA
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {suggestions && suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No drivers are currently available. They will be notified when they come online.
        </p>
      )}
    </div>
  );
};
