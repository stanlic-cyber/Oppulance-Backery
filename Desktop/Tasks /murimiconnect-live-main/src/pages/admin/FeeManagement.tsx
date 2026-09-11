import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeeBalance {
  id: string;
  user_id: string;
  user_type: string;
  current_balance: number;
  billing_start_date: string;
  status: string;
  payment_proof_url: string | null;
  payment_reference: string | null;
  proof_submitted_at: string | null;
  verification_notes: string | null;
  created_at: string;
  profile?: {
    name: string;
    email: string;
  };
}

const AdminFeeManagement = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<FeeBalance[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedBalance, setSelectedBalance] = useState<FeeBalance | null>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    fetchBalances();
  }, [role, navigate]);

  const fetchBalances = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_fee_balances')
      .select('*')
      .order('updated_at', { ascending: false });

    if (data) {
      // Fetch profiles for each balance
      const profileIds = data.map((b) => b.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      setBalances(
        data.map((b) => ({
          ...b,
          profile: profileMap.get(b.user_id),
        }))
      );
    }
    setLoading(false);
  };

  const filteredBalances = balances.filter((b) => {
    if (filterStatus === 'all') return true;
    return b.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'locked':
        return <Badge variant="destructive">Locked</Badge>;
      case 'awaiting_verification':
        return <Badge variant="secondary">Awaiting Verification</Badge>;
      case 'otp_issued':
        return <Badge className="bg-amber-500">OTP Issued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleApprove = async () => {
    if (!selectedBalance || !user) return;

    setProcessing(true);
    try {
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      const { error } = await supabase
        .from('user_fee_balances')
        .update({
          status: 'otp_issued',
          otp_code: otp,
          otp_expires_at: expiresAt,
          verification_notes: verificationNotes,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBalance.id);

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert([
        {
          user_id: selectedBalance.user_id,
          type: 'fee_payment_approved',
          title: 'Payment Approved',
          message: `Your platform fee payment has been verified. Your OTP code is: ${otp}. This code expires in 10 minutes.`,
          link: '/settings',
        },
      ]);

      // Send OTP email
      if (selectedBalance.profile?.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-otp-email', {
            body: {
              recipient_email: selectedBalance.profile.email,
              recipient_name: selectedBalance.profile.name || 'User',
              otp_code: otp,
              amount_due: selectedBalance.current_balance,
              user_type: selectedBalance.user_type,
            },
          });

          if (emailError) throw emailError;
          console.log('OTP email sent successfully');
        } catch (emailErr) {
          console.error('Failed to send OTP email:', emailErr);
          // Don't fail the approval if email fails
        }
      }

      toast.success(`Payment approved! OTP: ${otp}`);
      setShowVerifyDialog(false);
      setVerificationNotes('');
      fetchBalances();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBalance || !user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_fee_balances')
        .update({
          status: 'locked',
          verification_notes: verificationNotes,
          payment_proof_url: null,
          payment_reference: null,
          proof_submitted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBalance.id);

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert([
        {
          user_id: selectedBalance.user_id,
          type: 'fee_payment_rejected',
          title: 'Payment Rejected',
          message: `Your platform fee payment was rejected. Reason: ${verificationNotes || 'Payment proof could not be verified.'}`,
          link: '/settings',
        },
      ]);

      toast.success('Payment rejected');
      setShowVerifyDialog(false);
      setVerificationNotes('');
      fetchBalances();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject payment');
    } finally {
      setProcessing(false);
    }
  };

  const formatMoney = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0.00';
    return Number(value).toFixed(2);
  };

  if (loading) {
    return (
      <AdminLayout title="Fee Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Fee Management">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balances.filter((b) => b.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">
                Locked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balances.filter((b) => b.status === 'locked').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Awaiting Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balances.filter((b) => b.status === 'awaiting_verification').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">OTP Issued</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balances.filter((b) => b.status === 'otp_issued').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
              <SelectItem value="awaiting_verification">
                Awaiting Verification
              </SelectItem>
              <SelectItem value="otp_issued">OTP Issued</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBalances.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {balance.profile?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {balance.profile?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{balance.user_type}</TableCell>
                  <TableCell>
                    USD {formatMoney(balance.current_balance)}
                  </TableCell>
                  <TableCell>{getStatusBadge(balance.status)}</TableCell>
                  <TableCell>
                    {balance.payment_reference || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {balance.payment_proof_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBalance(balance);
                            setShowProofDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {balance.status === 'awaiting_verification' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBalance(balance);
                            setShowVerifyDialog(true);
                          }}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBalances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No fee balances found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Proof Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              Reference: {selectedBalance?.payment_reference}
            </DialogDescription>
          </DialogHeader>
          {selectedBalance?.payment_proof_url && (
            <img
              src={selectedBalance.payment_proof_url}
              alt="Payment proof"
              className="max-h-96 object-contain mx-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
            <DialogDescription>
              Review and approve or reject this payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">User</p>
              <p className="font-medium">{selectedBalance?.profile?.name}</p>
              <p className="text-sm">{selectedBalance?.profile?.email}</p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-2xl font-bold">
                USD {formatMoney(selectedBalance?.current_balance)}
              </p>
            </div>

            {selectedBalance?.payment_proof_url && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowVerifyDialog(false);
                  setShowProofDialog(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Payment Proof
              </Button>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Verification Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this verification..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Send OTP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFeeManagement;
