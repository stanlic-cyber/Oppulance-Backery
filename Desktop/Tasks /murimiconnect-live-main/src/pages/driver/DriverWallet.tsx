import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowLeft, AlertCircle, Upload, Loader2, CreditCard, Smartphone, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_FEE_USD, PAYMENT_INSTRUCTIONS, SUPPORT_PHONE } from '@/lib/constants';
import { toast } from 'sonner';

interface WalletData {
  balance_usd: number;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount_usd: number;
  reason: string;
  proof_url: string | null;
  created_at: string;
}

const DriverWallet = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupReference, setTopupReference] = useState('');

  useEffect(() => {
    if (role !== 'driver') {
      navigate('/marketplace');
      return;
    }
    fetchWalletData();
  }, [user, role]);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      const { data: walletData } = await supabase
        .from('driver_wallets')
        .select('balance_usd')
        .eq('driver_id', user.id)
        .maybeSingle();

      setWallet(walletData);

      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(txData || []);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleTopupRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!topupReference.trim()) {
      toast.error('Please enter a payment reference');
      return;
    }

    setSubmitting(true);

    try {
      // Create a pending topup transaction record
      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          driver_id: user.id,
          type: 'topup',
          amount_usd: amount,
          reason: `Top-up request - Ref: ${topupReference.trim()} (Pending admin approval)`,
        });

      if (error) throw error;

      toast.success('Top-up request submitted! Admin will credit your wallet after verification.');
      setTopupAmount('');
      setTopupReference('');
      fetchWalletData();
    } catch (err: any) {
      console.error('Error submitting topup:', err);
      toast.error(err.message || 'Failed to submit top-up request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen">
        <div className="container py-6 md:py-8 max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/driver')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                Driver Wallet
              </h1>
              <p className="text-muted-foreground">Manage your balance and top-ups</p>
            </div>
          </div>

          {/* Balance Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardDescription>Current Balance</CardDescription>
              <CardTitle className="text-4xl text-primary">
                ${(wallet?.balance_usd || 0).toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(wallet?.balance_usd || 0) < PLATFORM_FEE_USD ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your balance is below ${PLATFORM_FEE_USD}. You need at least ${PLATFORM_FEE_USD} to confirm a delivery pickup.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Platform fee of ${PLATFORM_FEE_USD} will be deducted when you confirm a delivery pickup.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top-up Instructions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Top-up Your Wallet</CardTitle>
              <CardDescription>
                Send payment to one of these accounts, then submit your reference below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <span className="font-medium">EcoCash</span>
                  </div>
                  <p className="text-sm font-mono">{PAYMENT_INSTRUCTIONS.ecocash}</p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">OneMoney</span>
                  </div>
                  <p className="text-sm font-mono">{PAYMENT_INSTRUCTIONS.onemoney}</p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Bank Transfer</span>
                  </div>
                  <p className="text-xs">{PAYMENT_INSTRUCTIONS.bank}</p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Use your user ID as reference: <code className="font-mono text-xs bg-muted px-1 rounded">{user?.id.slice(0, 8)}</code>
                </AlertDescription>
              </Alert>

              <form onSubmit={handleTopupRequest} className="space-y-4 pt-4 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="e.g. 20"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Payment Reference / Transaction ID</Label>
                    <Input
                      id="reference"
                      value={topupReference}
                      onChange={(e) => setTopupReference(e.target.value)}
                      placeholder="e.g. MP230120.1234.A12345"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Top-up Request
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground">
                Need help? WhatsApp: {SUPPORT_PHONE}
              </p>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {tx.type === 'topup' ? '💰 Top Up' : '🔻 Platform Fee'}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{tx.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`font-bold ${tx.type === 'topup' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'topup' ? '+' : '-'}${tx.amount_usd.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DriverWallet;
