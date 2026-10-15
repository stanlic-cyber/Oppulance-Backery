import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Truck, Loader2, Users, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import DriverCard from '@/components/driver/DriverCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ZIMBABWE_PROVINCES, VEHICLE_TYPES } from '@/lib/constants';

interface Driver {
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
}

const HireDriver = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    fetchDrivers();
  }, [user, authLoading, navigate]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      // Use public view - does not expose phone numbers for privacy
      // Only fetch online and available drivers for buyer/seller visibility
      const { data, error } = await supabase
        .from('driver_profiles_public')
        .select('*')
        .eq('is_available', true)
        .eq('is_online', true)
        .order('total_deliveries', { ascending: false });

      if (error) throw error;
      setDrivers((data as Driver[]) || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription to driver availability changes
  useEffect(() => {
    const channel = supabase
      .channel('driver-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_profiles',
        },
        () => {
          // Refetch drivers when any driver profile changes
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          driver.name.toLowerCase().includes(query) ||
          driver.province.toLowerCase().includes(query) ||
          (driver.nearest_town?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      // Province filter
      if (provinceFilter && provinceFilter !== 'all' && driver.province !== provinceFilter) {
        return false;
      }

      // Vehicle filter
      if (vehicleFilter && vehicleFilter !== 'all' && driver.vehicle_type !== vehicleFilter) {
        return false;
      }

      // Availability filter
      if (availableOnly && !driver.is_available) {
        return false;
      }

      return true;
    });
  }, [drivers, searchQuery, provinceFilter, vehicleFilter, availableOnly]);

  const handleViewProfile = (driverId: string) => {
    navigate(`/driver-profile/${driverId}`);
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const hasActiveFilters = searchQuery || provinceFilter !== 'all' || vehicleFilter !== 'all' || !availableOnly;
  
  const clearFilters = () => {
    setSearchQuery('');
    setProvinceFilter('all');
    setVehicleFilter('all');
    setAvailableOnly(true);
  };

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen py-8">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Hire a Driver</h1>
                <p className="text-muted-foreground text-sm">
                  Find reliable drivers for your deliveries
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:w-auto h-11"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">!</Badge>
                  )}
                </Button>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Province</Label>
                      <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="All provinces" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All provinces</SelectItem>
                          {ZIMBABWE_PROVINCES.map((province) => (
                            <SelectItem key={province} value={province}>
                              {province}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Vehicle Type</Label>
                      <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="All vehicles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All vehicles</SelectItem>
                          {VEHICLE_TYPES.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.icon} {vehicle.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between md:justify-start gap-3 pt-2 md:pt-6">
                      <Switch
                        id="available-only"
                        checked={availableOnly}
                        onCheckedChange={setAvailableOnly}
                      />
                      <Label htmlFor="available-only" className="text-sm cursor-pointer">Available only</Label>
                    </div>
                  </div>
                  
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                      <X className="h-3 w-3 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading drivers...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No drivers found</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  {searchQuery || provinceFilter !== 'all' || vehicleFilter !== 'all'
                    ? 'Try adjusting your filters or search query'
                    : 'No drivers are currently available'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{filteredDrivers.length}</span> driver{filteredDrivers.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <div className="grid gap-3">
                {filteredDrivers.map((driver) => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    onViewProfile={handleViewProfile}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default HireDriver;