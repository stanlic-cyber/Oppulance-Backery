import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Navigation, MapPin, Clock } from 'lucide-react';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Zimbabwe province coordinates (approximate centers)
const PROVINCE_COORDS: Record<string, [number, number]> = {
  'Harare': [-17.8292, 31.0522],
  'Bulawayo': [-20.1325, 28.6268],
  'Manicaland': [-19.0208, 32.6509],
  'Mashonaland Central': [-16.7644, 31.0788],
  'Mashonaland East': [-17.9993, 31.9157],
  'Mashonaland West': [-17.4851, 29.7889],
  'Masvingo': [-20.0673, 30.8294],
  'Matabeleland North': [-18.5309, 27.5495],
  'Matabeleland South': [-21.0490, 29.0454],
  'Midlands': [-19.0556, 29.6042],
};

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
}

interface DeliveryMapProps {
  deliveryId: string;
  driverId?: string | null;
  pickupProvince: string;
  pickupTown?: string | null;
  dropoffProvince: string;
  dropoffTown?: string | null;
  status: string;
}

// Component to fit bounds
const FitBounds = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
};

export const DeliveryMap = ({
  deliveryId,
  driverId,
  pickupProvince,
  pickupTown,
  dropoffProvince,
  dropoffTown,
  status,
}: DeliveryMapProps) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);

  // Get coordinates
  const pickupCoords = PROVINCE_COORDS[pickupProvince] || [-17.8292, 31.0522];
  const dropoffCoords = PROVINCE_COORDS[dropoffProvince] || [-17.8292, 31.0522];

  // Fetch driver location initially
  useEffect(() => {
    const fetchDriverLocation = async () => {
      if (!driverId || !['assigned', 'pickup_confirmed', 'in_transit'].includes(status)) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('driver_locations')
          .select('*')
          .eq('driver_id', driverId)
          .maybeSingle();

        if (data) {
          setDriverLocation(data);
          calculateETA(data.latitude, data.longitude);
        }
      } catch (err) {
        console.error('Error fetching driver location:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverLocation();
  }, [driverId, status]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!driverId || !['assigned', 'pickup_confirmed', 'in_transit'].includes(status)) {
      return;
    }

    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          if (payload.new) {
            const newLocation = payload.new as DriverLocation;
            setDriverLocation(newLocation);
            calculateETA(newLocation.latitude, newLocation.longitude);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, status]);

  // Simple ETA calculation (distance-based estimate)
  const calculateETA = (driverLat: number, driverLng: number) => {
    const targetCoords = status === 'in_transit' ? dropoffCoords : pickupCoords;
    const distance = getDistanceInKm(driverLat, driverLng, targetCoords[0], targetCoords[1]);
    
    // Estimate: 40 km/h average speed
    const hours = distance / 40;
    if (hours < 1) {
      setEta(`~${Math.round(hours * 60)} mins`);
    } else {
      setEta(`~${hours.toFixed(1)} hours`);
    }
  };

  // Haversine formula for distance
  const getDistanceInKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const bounds: L.LatLngBoundsExpression = [pickupCoords, dropoffCoords];

  // Include driver location in bounds if available
  const allPoints = [pickupCoords, dropoffCoords];
  if (driverLocation) {
    allPoints.push([driverLocation.latitude, driverLocation.longitude] as [number, number]);
  }

  // Route line
  const routePoints: [number, number][] = driverLocation
    ? [
        [driverLocation.latitude, driverLocation.longitude],
        status === 'in_transit' ? dropoffCoords : pickupCoords,
      ]
    : [pickupCoords, dropoffCoords];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Live Tracking
          </span>
          {eta && driverLocation && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ETA: {eta}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[300px] w-full relative">
          <MapContainer
            center={pickupCoords}
            zoom={7}
            scrollWheelZoom={false}
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <FitBounds bounds={allPoints.length > 1 ? allPoints as L.LatLngBoundsExpression : bounds} />

            {/* Pickup marker */}
            <Marker position={pickupCoords} icon={pickupIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>📦 Pickup</strong><br />
                  {pickupProvince}
                  {pickupTown && <>, {pickupTown}</>}
                </div>
              </Popup>
            </Marker>

            {/* Dropoff marker */}
            <Marker position={dropoffCoords} icon={dropoffIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>🏠 Dropoff</strong><br />
                  {dropoffProvince}
                  {dropoffTown && <>, {dropoffTown}</>}
                </div>
              </Popup>
            </Marker>

            {/* Driver marker */}
            {driverLocation && (
              <Marker 
                position={[driverLocation.latitude, driverLocation.longitude]} 
                icon={driverIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>🚚 Driver Location</strong><br />
                    {driverLocation.speed && <>Speed: {driverLocation.speed.toFixed(0)} km/h<br /></>}
                    Updated: {new Date(driverLocation.updated_at).toLocaleTimeString()}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route line */}
            <Polyline 
              positions={routePoints}
              color="#3b82f6"
              weight={3}
              dashArray="10, 10"
            />
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="p-3 border-t flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-green-500" />
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-red-500" />
            <span>Dropoff</span>
          </div>
          {driverLocation && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blue-500" />
              <span>Driver</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};