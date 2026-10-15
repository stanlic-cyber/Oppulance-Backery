import { useState } from 'react';
import { AlertTriangle, Upload, Key, Loader2, CheckCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFeeStatus } from '@/hooks/useFeeStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createFeeNotification } from '@/lib/feeNotifications';

export function LockedAccountBanner() {
  const { user } = useAuth();
  const {
    feeBalance,
    paymentSettings,
    isLocked,
    isAwaitingVerification,
    isOtpIssued,
    submitPaymentProof,
    verifyOtp,
  } = useFeeStatus();

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!feeBalance || feeBalance.status === 'active') {
    return null;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const { error, reference } = await submitPaymentProof(urlData.publicUrl);

      if (error) throw error;

      // Create notification for proof submitted
      if (user) {
        await createFeeNotification(user.id, 'proof_submitted');
      }

      toast.success(`Payment proof submitted! Reference: ${reference}`);
      setShowPaymentDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!otpCode.trim()) {
      toast.error('Please enter the OTP code');
      return;
    }

    setVerifying(true);
    try {
      const { error } = await verifyOtp(otpCode.trim());
      if (error) throw error;

      // Create notification for account unlocked
      if (user) {
        await createFeeNotification(user.id, 'account_unlocked');
      }

      toast.success('Account unlocked successfully!');
      setShowOtpDialog(false);
      setOtpCode('');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  const formatMoney = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0.00';
    return Number(value).toFixed(2);
  };

  return (
    <>
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>
          {isLocked && 'Account Locked - Platform Fee Unpaid'}
          {isAwaitingVerification && 'Payment Verification Pending'}
          {isOtpIssued && 'OTP Verification Required'}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {isLocked && (
            <>
              <p className="mb-2">
                Your outstanding platform fee of{' '}
                <strong>
                  {paymentSettings?.currency || 'USD'} {formatMoney(feeBalance.current_balance)}
                </strong>{' '}
                is due. You cannot create listings, accept offers, or go online until payment is verified.
              </p>
              <Button size="sm" onClick={() => setShowPaymentDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Submit Payment Proof
              </Button>
            </>
          )}
          {isAwaitingVerification && (
            <>
              <p className="mb-2">
                Your payment proof is being reviewed by our admin team. You'll receive a notification once verified.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Reference: {feeBalance.payment_reference}
              </div>
            </>
          )}
          {isOtpIssued && (
            <>
              <p className="mb-2">
                Your payment has been verified! Enter the OTP sent to you to unlock your account.
              </p>
              <Button size="sm" onClick={() => setShowOtpDialog(true)}>
                <Key className="h-4 w-4 mr-2" />
                Enter OTP
              </Button>
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Payment Proof Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Payment Proof</DialogTitle>
            <DialogDescription>
              Pay your platform fee and upload proof of payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Amount Due</h4>
              <p className="text-2xl font-bold">
                {paymentSettings?.currency || 'USD'} {formatMoney(feeBalance?.current_balance)}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Payment Options</h4>
              
              {paymentSettings?.ecocash_number && (
                <div className="p-3 border rounded-lg">
                  <p className="font-medium text-sm">EcoCash</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentSettings.ecocash_name}
                  </p>
                  <p className="font-mono text-sm">{paymentSettings.ecocash_number}</p>
                </div>
              )}

              {paymentSettings?.bank_account_number && (
                <div className="p-3 border rounded-lg">
                  <p className="font-medium text-sm">{paymentSettings.bank_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentSettings.bank_account_name}
                  </p>
                  <p className="font-mono text-sm">{paymentSettings.bank_account_number}</p>
                  {paymentSettings.bank_branch && (
                    <p className="text-xs text-muted-foreground">
                      Branch: {paymentSettings.bank_branch}
                    </p>
                  )}
                </div>
              )}

              {!paymentSettings?.ecocash_number && !paymentSettings?.bank_account_number && (
                <p className="text-sm text-muted-foreground">
                  Payment details not configured. Please contact support.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof">Upload Payment Proof</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Upload a screenshot or photo of your payment confirmation
              </p>
            </div>

            {uploading && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading proof...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter OTP Code</DialogTitle>
            <DialogDescription>
              Enter the verification code sent to you
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">OTP Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleOtpVerify}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify & Unlock
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
