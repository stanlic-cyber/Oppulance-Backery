import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ZIMBABWE_PROVINCES, VEHICLE_TYPES } from '@/lib/constants';
import { toast } from 'sonner';

const DriverSetup = () => {
  const { user, profile, refreshDriverProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [province, setProvince] = useState('');
  const [nearestTown, setNearestTown] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleDesc, setVehicleDesc] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (!province || !vehicleType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Create driver profile
      const { error: driverError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: user.id,
          name: name || profile?.name || 'Driver',
          phone: phone || profile?.phone,
          province,
          nearest_town: nearestTown || null,
          vehicle_type: vehicleType,
          vehicle_desc: vehicleDesc || null,
        });

      if (driverError) {
        if (driverError.code === '23505') {
          toast.error('Driver profile already exists');
          navigate('/driver');
          return;
        }
        throw driverError;
      }

      // Create wallet for driver
      const { error: walletError } = await supabase
        .from('driver_wallets')
        .insert({
          driver_id: user.id,
          balance_usd: 0,
        });

      if (walletError && walletError.code !== '23505') {
        console.error('Wallet creation error:', walletError);
      }

      await refreshDriverProfile();
      toast.success('Driver profile created successfully!');
      navigate('/driver');
    } catch (err: any) {
      console.error('Error creating driver profile:', err);
      toast.error(err.message || 'Failed to create driver profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen py-8">
        <div className="container max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground mb-4">
              <Truck className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">Complete Your Driver Profile</h1>
            <p className="text-muted-foreground mt-2">
              Set up your vehicle details to start accepting delivery jobs
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-xl p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+263 77 123 4567"
                />
              </div>

              {/* Province */}
              <div className="space-y-2">
                <Label>Province *</Label>
                <Select value={province} onValueChange={setProvince} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your province" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZIMBABWE_PROVINCES.map((prov) => (
                      <SelectItem key={prov} value={prov}>
                        {prov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nearest Town */}
              <div className="space-y-2">
                <Label htmlFor="town">Nearest Town (optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="town"
                    value={nearestTown}
                    onChange={(e) => setNearestTown(e.target.value)}
                    placeholder="e.g. Borrowdale, Bulawayo CBD"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-2">
                <Label>Vehicle Type *</Label>
                <Select value={vehicleType} onValueChange={setVehicleType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <span className="mr-2">{vehicle.icon}</span>
                        {vehicle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle Description */}
              <div className="space-y-2">
                <Label htmlFor="vehicleDesc">Vehicle Description (optional)</Label>
                <Textarea
                  id="vehicleDesc"
                  value={vehicleDesc}
                  onChange={(e) => setVehicleDesc(e.target.value)}
                  placeholder="e.g. White Toyota Dyna, 3 tonne capacity, covered with tarp"
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            You'll need to top up your wallet with at least $5 before confirming your first delivery pickup.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default DriverSetup;
