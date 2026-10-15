import { MapPin, Truck, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VEHICLE_TYPES } from '@/lib/constants';

interface DriverCardProps {
  driver: {
    id: string;
    user_id: string;
    name: string;
    phone?: string;
    province: string;
    nearest_town?: string;
    vehicle_type: string;
    vehicle_desc?: string;
    is_available: boolean;
    is_online?: boolean;
    current_status?: string;
    last_seen?: string;
    average_rating?: number;
    total_deliveries: number;
  };
  onViewProfile: (driverId: string) => void;
}

const getStatusBadge = (driver: DriverCardProps['driver']) => {
  if (driver.is_online && driver.current_status === 'available') {
    return { label: 'Online', className: 'bg-green-500/90 hover:bg-green-500 text-white' };
  }
  if (driver.is_online && driver.current_status === 'busy') {
    return { label: 'Busy', className: 'bg-orange-500/90 hover:bg-orange-500 text-white' };
  }
  return { label: 'Offline', className: 'bg-gray-400/90 hover:bg-gray-400 text-white' };
};

const DriverCard = ({ driver, onViewProfile }: DriverCardProps) => {
  const vehicleInfo = VEHICLE_TYPES.find(v => v.id === driver.vehicle_type);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">
              {driver.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-foreground truncate">{driver.name}</h3>
              {(() => {
                const status = getStatusBadge(driver);
                return (
                  <Badge 
                    variant="default"
                    className={`shrink-0 text-xs ${status.className}`}
                  >
                    {status.label}
                  </Badge>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {driver.nearest_town ? `${driver.nearest_town}, ` : ''}{driver.province}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {vehicleInfo ? `${vehicleInfo.icon} ${vehicleInfo.label}` : driver.vehicle_type}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {driver.total_deliveries > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{driver.total_deliveries}</span>
                  {driver.total_deliveries === 1 ? 'delivery' : 'deliveries'}
                </span>
              )}
              {driver.average_rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-foreground">{driver.average_rating.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewProfile(driver.user_id)}
            className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          >
            View
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverCard;