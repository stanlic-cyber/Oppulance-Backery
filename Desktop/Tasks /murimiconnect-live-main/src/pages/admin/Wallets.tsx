import { useEffect, useState } from 'react';
import { Wallet, Check, Clock, User, DollarSign, RefreshCw, Search } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface WalletTransaction {
  id: string;
  driver_id: string;
  type: string;
  amount_usd: number;
  reason: string;
  admin_id: string | null;
  created_at: string;
  driver_name?: string;
  driver_phone?: string;
}

interface DriverWallet {
  id: string;
  driver_id: string;
  balance_usd: number;
  driver_name?: string;
  driver_phone?: string;
}

const AdminWallets = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingTopups, setPendingTopups] = useState<WalletTransaction[]>([]);
  const [driverWallets, setDriverWallets] = useState<DriverWallet[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTopup, setSelectedTopup] = useState<WalletTransaction | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pending topup requests (transactions where type is 'topup' and admin_id is null)
      const { data: topupsData, error: topupsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('type', 'topup')
        .is('admin_id', null)
        .order('created_at', { ascending: false });

      if (topupsError) throw topupsError;

      // Fetch all driver wallets
      const { data: walletsData, error: walletsError } = await supabase
        .from('driver_wallets')
        .select('*')
        .order('balance_usd', { ascending: true });

      if (walletsError) throw walletsError;

      // Get driver profiles for names
      const driverIds = new Set<string>();
      (topupsData || []).forEach(t => driverIds.add(t.driver_id));
      (walletsData || []).forEach(w => driverIds.add(w.driver_id));

      const { data: driversData } = await supabase
        .from('driver_profiles')
        .select('user_id, name, phone')
        .in('user_id', Array.from(driverIds));

      const driverMap = new Map<string, { name: string; phone: string | null }>();
      (driversData || []).forEach(d => {
        driverMap.set(d.user_id, { name: d.name, phone: d.phone });
      });

      // Enrich topups with driver info
      const enrichedTopups = (topupsData || []).map(t => ({
        ...t,
        driver_name: driverMap.get(t.driver_id)?.name || 'Unknown',
        driver_phone: driverMap.get(t.driver_id)?.phone || undefined,
      }));

      // Enrich wallets with driver info
      const enrichedWallets = (walletsData || []).map(w => ({
        ...w,
        driver_name: driverMap.get(w.driver_id)?.name || 'Unknown',
        driver_phone: driverMap.get(w.driver_id)?.phone || undefined,
      }));

      setPendingTopups(enrichedTopups);
      setDriverWallets(enrichedWallets);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTopup = async () => {
    if (!selectedTopup || !user) return;

    setProcessing(true);
    try {
      // Call the credit_driver_wallet function
      const { data: success, error } = await supabase.rpc('credit_driver_wallet', {
        p_driver_id: selectedTopup.driver_id,
        p_amount: selectedTopup.amount_usd,
        p_admin_id: user.id,
        p_reason: `Approved: ${selectedTopup.reason}`,
      });

      if (error) throw error;

      if (!success) {
        toast.error('Failed to credit wallet. Please try again.');
        return;
      }

      // Delete the pending transaction request (it's now replaced by the credited one)
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', selectedTopup.id);

      toast.success(`Successfully credited $${selectedTopup.amount_usd} to ${selectedTopup.driver_name}'s wallet`);
      setSelectedTopup(null);
      fetchData();
    } catch (err: any) {
      console.error('Error approving topup:', err);
      toast.error(err.message || 'Failed to approve top-up');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTopup = async () => {
    if (!selectedTopup) return;

    setProcessing(true);
    try {
      // Simply delete the pending transaction
      const { error } = await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', selectedTopup.id);

      if (error) throw error;

      toast.success('Top-up request rejected');
      setSelectedTopup(null);
      fetchData();
    } catch (err: any) {
      console.error('Error rejecting topup:', err);
      toast.error(err.message || 'Failed to reject top-up');
    } finally {
      setProcessing(false);
    }
  };

  const filteredWallets = driverWallets.filter(w =>
    w.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.driver_phone?.includes(search)
  );

  const totalPending = pendingTopups.reduce((sum, t) => sum + Number(t.amount_usd), 0);
  const totalBalance = driverWallets.reduce((sum, w) => sum + Number(w.balance_usd), 0);

  return (
    <AdminLayout title="Driver Wallets">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Top-ups
            </CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTopups.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalPending.toFixed(2)} total requested
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Drivers
            </CardTitle>
            <User className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverWallets.length}</div>
            <p className="text-xs text-muted-foreground">With wallets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Across all wallets</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Top-ups */}
      {pendingTopups.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Top-up Requests
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTopups.map((topup) => (
                    <TableRow key={topup.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{topup.driver_name}</p>
                          {topup.driver_phone && (
                            <p className="text-xs text-muted-foreground">{topup.driver_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          ${Number(topup.amount_usd).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {topup.reason}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(topup.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => setSelectedTopup(topup)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Driver Wallets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            All Driver Wallets
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredWallets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {search ? 'No drivers found' : 'No driver wallets yet'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell className="font-medium">
                        {wallet.driver_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {wallet.driver_phone || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${Number(wallet.balance_usd).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(wallet.balance_usd) >= 5 ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Low Balance
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!selectedTopup} onOpenChange={(open) => !open && setSelectedTopup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Top-up Request</DialogTitle>
            <DialogDescription>
              Verify the payment before approving this top-up request.
            </DialogDescription>
          </DialogHeader>

          {selectedTopup && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Driver</p>
                  <p className="font-medium">{selectedTopup.driver_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-lg">${Number(selectedTopup.amount_usd).toFixed(2)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Reference/Details</p>
                <p className="font-medium bg-muted p-2 rounded mt-1 text-sm">
                  {selectedTopup.reason}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Requested</p>
                <p className="font-medium">
                  {format(new Date(selectedTopup.created_at), 'PPpp')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRejectTopup}
              disabled={processing}
              className="flex-1"
            >
              Reject
            </Button>
            <Button
              onClick={handleApproveTopup}
              disabled={processing}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve & Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminWallets;