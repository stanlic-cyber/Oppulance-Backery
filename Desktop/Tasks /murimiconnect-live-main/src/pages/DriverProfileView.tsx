import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Truck, Phone, MessageCircle, Star, Loader2, Send, Award, Package } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import HireDriverDialog from '@/components/driver/HireDriverDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VEHICLE_TYPES } from '@/lib/constants';
import { toast } from 'sonner';

interface DriverProfile {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  province: string;
  nearest_town?: string;
  vehicle_type: string;
  vehicle_desc?: string;
  is_available: boolean;
  average_rating?: number;
  rating_count: number;
  total_deliveries: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DriverProfileView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDriver(id);
    }
  }, [id]);

  const fetchDriver = async (driverId: string) => {
    setLoading(true);
    try {
      // ✅ FIX IDOR-003: Validate UUID format to prevent enumeration
      if (!driverId || !UUID_REGEX.test(driverId)) {
        toast.error('Invalid driver ID format');
        navigate('/marketplace');
        setLoading(false);
        return;
      }

      // Use public view for browsing (no phone exposed)
      const { data, error } = await supabase
        .from('driver_profiles_public')
        .select('*')
        .eq('user_id', driverId)
        .single();

      if (error || !data) {
        toast.error('Driver not found');
        navigate('/marketplace');
        setLoading(false);
        return;
      }

      setDriver(data as DriverProfile);
    } catch (err) {
      console.error('Error fetching driver:', err);
      toast.error('Failed to load driver profile');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (driver?.phone) {
      window.location.href = `tel:${driver.phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (driver?.phone) {
      const cleanedPhone = driver.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanedPhone}`, '_blank');
    }
  };

  const vehicleInfo = driver ? VEHICLE_TYPES.find(v => v.id === driver.vehicle_type) : null;

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading driver profile...</p>
        </div>
      </Layout>
    );
  }

  if (!driver) {
    return (
      <Layout>
        <div className="container py-8 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Driver not found</h3>
              <p className="text-muted-foreground text-sm">
                This driver profile may no longer be available.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen py-8">
        <div className="container max-w-2xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Main Profile Card */}
          <Card className="mb-4 shadow-sm overflow-hidden">
            {/* Header with Avatar */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-bold text-primary">
                    {driver.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold truncate">{driver.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge 
                      className={driver.is_available 
                        ? 'bg-green-500 hover:bg-green-500' 
                        : 'bg-gray-400 hover:bg-gray-400'
                      }
                    >
                      {driver.is_available ? 'Available' : 'Busy'}
                    </Badge>
                    {driver.average_rating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{driver.average_rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({driver.rating_count})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="pt-5 space-y-5">
              {/* Info Grid */}
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Operating Area</p>
                    <p className="font-medium">
                      {driver.nearest_town ? `${driver.nearest_town}, ` : ''}{driver.province}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Vehicle</p>
                    <p className="font-medium">
                      {vehicleInfo ? `${vehicleInfo.icon} ${vehicleInfo.label}` : driver.vehicle_type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Description */}
              {driver.vehicle_desc && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1 font-medium">Vehicle Details</p>
                  <p className="text-sm">{driver.vehicle_desc}</p>
                </div>
              )}

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-bold text-primary">{driver.total_deliveries}</p>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Deliveries</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Award className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-bold text-primary">
                      {driver.average_rating ? driver.average_rating.toFixed(1) : 'New'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info - Only visible after driver accepts a request */}
          <Card className="mb-4 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Driver</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Contact details will be available after the driver accepts your hire request.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Hire Button */}
          {user && (role === 'buyer' || role === 'farmer') && driver.is_available && (
            <Button
              size="lg"
              className="w-full h-12 text-base shadow-lg"
              onClick={() => setHireDialogOpen(true)}
            >
              <Send className="h-5 w-5 mr-2" />
              Request This Driver
            </Button>
          )}

          {user && (role === 'buyer' || role === 'farmer') && !driver.is_available && (
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-muted-foreground text-sm">
                This driver is currently busy. Please check back later.
              </p>
            </div>
          )}

          {!user && (
            <Button
              size="lg"
              className="w-full h-12 text-base"
              onClick={() => navigate('/auth')}
            >
              Sign In to Hire Driver
            </Button>
          )}
        </div>
      </div>

      {driver && (
        <HireDriverDialog
          open={hireDialogOpen}
          onOpenChange={setHireDialogOpen}
          driver={{ user_id: driver.user_id, name: driver.name }}
        />
      )}
    </Layout>
  );
};

export default DriverProfileView;