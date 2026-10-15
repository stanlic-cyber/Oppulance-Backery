import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, CreditCard, Building2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentSettings {
  id: string;
  ecocash_name: string;
  ecocash_number: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  currency: string;
  seller_fee_percent: number;
  driver_fee_percent: number;
}

const AdminPaymentSettings = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    id: '',
    ecocash_name: '',
    ecocash_number: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    currency: 'USD',
    seller_fee_percent: 5,
    driver_fee_percent: 5,
  });

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('platform_payment_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings({
          id: data.id,
          ecocash_name: data.ecocash_name || '',
          ecocash_number: data.ecocash_number || '',
          bank_name: data.bank_name || '',
          bank_account_name: data.bank_account_name || '',
          bank_account_number: data.bank_account_number || '',
          bank_branch: data.bank_branch || '',
          currency: data.currency || 'USD',
          seller_fee_percent: data.seller_fee_percent || 5,
          driver_fee_percent: data.driver_fee_percent || 5,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [role, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_payment_settings')
        .update({
          ecocash_name: settings.ecocash_name || null,
          ecocash_number: settings.ecocash_number || null,
          bank_name: settings.bank_name || null,
          bank_account_name: settings.bank_account_name || null,
          bank_account_number: settings.bank_account_number || null,
          bank_branch: settings.bank_branch || null,
          currency: settings.currency,
          seller_fee_percent: settings.seller_fee_percent,
          driver_fee_percent: settings.driver_fee_percent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Payment settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Payment Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Payment Settings">
      <div className="space-y-6">

        <div className="grid gap-6 md:grid-cols-2">
          {/* EcoCash Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                EcoCash Details
              </CardTitle>
              <CardDescription>
                Mobile money payment details for fee collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ecocash_name">Account Name</Label>
                <Input
                  id="ecocash_name"
                  placeholder="e.g., Murimi Connect"
                  value={settings.ecocash_name}
                  onChange={(e) =>
                    setSettings({ ...settings, ecocash_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ecocash_number">EcoCash Number</Label>
                <Input
                  id="ecocash_number"
                  placeholder="e.g., 0771234567"
                  value={settings.ecocash_number}
                  onChange={(e) =>
                    setSettings({ ...settings, ecocash_number: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Bank Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bank Details
              </CardTitle>
              <CardDescription>
                Bank account details for fee collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  placeholder="e.g., CBZ Bank"
                  value={settings.bank_name}
                  onChange={(e) =>
                    setSettings({ ...settings, bank_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_name">Account Name</Label>
                <Input
                  id="bank_account_name"
                  placeholder="e.g., Murimi Connect Pvt Ltd"
                  value={settings.bank_account_name}
                  onChange={(e) =>
                    setSettings({ ...settings, bank_account_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  placeholder="e.g., 1234567890"
                  value={settings.bank_account_number}
                  onChange={(e) =>
                    setSettings({ ...settings, bank_account_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_branch">Branch (Optional)</Label>
                <Input
                  id="bank_branch"
                  placeholder="e.g., Harare Main"
                  value={settings.bank_branch}
                  onChange={(e) =>
                    setSettings({ ...settings, bank_branch: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Fee Rates */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Fee Rates
              </CardTitle>
              <CardDescription>
                Configure platform fee percentages for sellers and drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    placeholder="USD"
                    value={settings.currency}
                    onChange={(e) =>
                      setSettings({ ...settings, currency: e.target.value.toUpperCase() })
                    }
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seller_fee">Seller Fee (%)</Label>
                  <Input
                    id="seller_fee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.seller_fee_percent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        seller_fee_percent: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver_fee">Driver Fee (%)</Label>
                  <Input
                    id="driver_fee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.driver_fee_percent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        driver_fee_percent: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentSettings;
