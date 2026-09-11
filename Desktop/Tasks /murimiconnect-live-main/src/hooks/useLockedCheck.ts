import { useFeeStatus } from '@/hooks/useFeeStatus';
import { toast } from 'sonner';

export function useLockedCheck() {
  const { isLocked, isAwaitingVerification, isOtpIssued, loading } = useFeeStatus();

  const isAccountRestricted = isLocked || isAwaitingVerification || isOtpIssued;

  const checkLocked = (action: string): boolean => {
    if (loading) return false;
    
    if (isLocked) {
      toast.error(`Cannot ${action} - your account is locked due to unpaid platform fees.`);
      return true;
    }
    
    if (isAwaitingVerification) {
      toast.error(`Cannot ${action} - please wait for your payment to be verified.`);
      return true;
    }
    
    if (isOtpIssued) {
      toast.error(`Cannot ${action} - please enter your OTP to unlock your account.`);
      return true;
    }
    
    return false;
  };

  return {
    isAccountRestricted,
    checkLocked,
    loading,
  };
}
