import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createFeeNotification, forceDriverOffline } from '@/lib/feeNotifications';

type FeeStatus = 'active' | 'locked' | 'awaiting_verification' | 'otp_issued';

interface FeeBalance {
  id: string;
  user_id: string;
  user_type: 'seller' | 'driver';
  current_balance: number;
  billing_start_date: string;
  status: FeeStatus;
  payment_proof_url: string | null;
  payment_reference: string | null;
  proof_submitted_at: string | null;
  verification_notes: string | null;
  otp_expires_at: string | null;
}

// Fee rates visible to all authenticated users (from view)
interface FeeRates {
  currency: string;
  seller_fee_percent: number;
  driver_fee_percent: number;
}

// Payment details only visible to locked users (from secure function)
interface PaymentDetails {
  ecocash_name: string | null;
  ecocash_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  currency: string;
}

// Combined settings for backward compatibility
interface PaymentSettings extends FeeRates {
  ecocash_name: string | null;
  ecocash_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
}

export function useFeeStatus() {
  const { user, role } = useAuth();
  const [feeBalance, setFeeBalance] = useState<FeeBalance | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const previousStatusRef = useRef<FeeStatus | null>(null);

  const userType = role === 'farmer' ? 'seller' : role === 'driver' ? 'driver' : null;
  const isLocked = feeBalance?.status === 'locked';
  const isAwaitingVerification = feeBalance?.status === 'awaiting_verification';
  const isOtpIssued = feeBalance?.status === 'otp_issued';

  useEffect(() => {
    if (!user || !userType) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch fee balance
      const { data: balanceData } = await supabase
        .from('user_fee_balances')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_type', userType)
        .maybeSingle();

      if (balanceData) {
        setFeeBalance(balanceData as FeeBalance);
        previousStatusRef.current = (balanceData as FeeBalance).status;
      }

      // Fetch fee rates from public view (safe for all users)
      const { data: feeRatesData } = await supabase
        .from('platform_fee_rates')
        .select('*')
        .limit(1)
        .maybeSingle();

      // Initialize settings with fee rates
      let settings: PaymentSettings = {
        currency: feeRatesData?.currency || 'USD',
        seller_fee_percent: feeRatesData?.seller_fee_percent || 5,
        driver_fee_percent: feeRatesData?.driver_fee_percent || 5,
        ecocash_name: null,
        ecocash_number: null,
        bank_name: null,
        bank_account_name: null,
        bank_account_number: null,
        bank_branch: null,
      };

      // Only fetch payment details if user is in a restricted status (needs to pay)
      const userStatus = (balanceData as FeeBalance | null)?.status;
      if (userStatus && ['locked', 'awaiting_verification', 'otp_issued'].includes(userStatus)) {
        const { data: paymentDetails } = await supabase
          .rpc('get_payment_details_for_locked_user');
        
        if (paymentDetails && paymentDetails.length > 0) {
          const details = paymentDetails[0];
          settings = {
            ...settings,
            ecocash_name: details.ecocash_name,
            ecocash_number: details.ecocash_number,
            bank_name: details.bank_name,
            bank_account_name: details.bank_account_name,
            bank_account_number: details.bank_account_number,
            bank_branch: details.bank_branch,
          };
        }
      }

      setPaymentSettings(settings);
      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('fee-balance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_fee_balances',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new) {
            const newBalance = payload.new as FeeBalance;
            const previousStatus = previousStatusRef.current;
            
            // Check if status just changed to locked
            if (previousStatus && previousStatus !== 'locked' && newBalance.status === 'locked') {
              // Create notification for account locked
              await createFeeNotification(user.id, 'account_locked');
              
              // Force driver offline if applicable
              if (userType === 'driver') {
                await forceDriverOffline(user.id);
              }
            }
            
            // Update previous status
            previousStatusRef.current = newBalance.status;
            setFeeBalance(newBalance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userType]);

  const submitPaymentProof = async (proofUrl: string) => {
    if (!user || !userType || !feeBalance) return { error: new Error('Not authenticated') };

    const reference = `MC-FEE-${user.id.slice(0, 8).toUpperCase()}-${new Date().toISOString().slice(0, 7).replace('-', '')}`;

    const { error } = await supabase.rpc('submit_fee_payment_proof', {
      p_proof_url: proofUrl,
      p_reference: reference,
    });

    return { error, reference };
  };

  const verifyOtp = async (otp: string) => {
    if (!feeBalance) return { error: new Error('No fee balance found') };

    const { data, error } = await supabase.rpc('verify_fee_otp', { p_otp: otp });
    if (error) return { error };

    const result = data as { ok: boolean; error?: string } | null;
    if (!result?.ok) {
      return { error: new Error(result?.error || 'Verification failed') };
    }
    return { error: null };
  };

  return {
    feeBalance,
    paymentSettings,
    loading,
    isLocked,
    isAwaitingVerification,
    isOtpIssued,
    userType,
    submitPaymentProof,
    verifyOtp,
  };
}
