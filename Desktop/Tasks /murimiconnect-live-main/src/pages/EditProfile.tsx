import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Home, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/ui/page-transition';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ZIMBABWE_PROVINCES } from '@/lib/constants';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EditProfile = () => {
  const { user, profile, updateProfile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [nearestTown, setNearestTown] = useState('');
  const [farmName, setFarmName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setProvince(profile.province || '');
      setNearestTown(profile.nearest_town || '');
      setFarmName(profile.farm_name || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('error.fillAllFields'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        province: province || undefined,
        nearest_town: nearestTown.trim() || undefined,
        farm_name: farmName.trim() || undefined,
      });

      if (error) throw error;
      toast.success(t('settings.profileUpdated'));
      navigate('/settings');
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title={t('settings.editProfile')} backTo="/settings" />

      <div className="bg-muted/30 min-h-screen pb-24 md:pb-8">
        <div className="container max-w-lg py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-card rounded-2xl p-5 space-y-4 border border-border shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="name">{t('profile.name')} *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('profile.phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" type="tel" placeholder="+263 77 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">{t('profile.province')}</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger className="rounded-xl">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder={t('common.allProvinces')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ZIMBABWE_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="town">{t('profile.nearestTown')}</Label>
                <Input id="town" placeholder="e.g. Marondera" value={nearestTown} onChange={(e) => setNearestTown(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="farm">{t('profile.farmName')}</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="farm" placeholder="e.g. Green Valley Farm" value={farmName} onChange={(e) => setFarmName(e.target.value)} className="pl-10" />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('common.loading')}</>
              ) : (
                t('settings.saveChanges')
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditProfile;
