import { supabase } from '@/integrations/supabase/client';

type FeeNotificationType = 
  | 'account_locked'
  | 'proof_submitted'
  | 'payment_approved'
  | 'payment_rejected'
  | 'otp_issued'
  | 'account_unlocked';

interface NotificationContent {
  title: string;
  message: string;
  link: string;
}

const notificationContent: Record<FeeNotificationType, NotificationContent> = {
  account_locked: {
    title: 'Account Locked - Payment Required',
    message: 'Your account has been locked due to unpaid platform fees. Please submit payment proof to continue using the platform.',
    link: '/settings',
  },
  proof_submitted: {
    title: 'Payment Proof Submitted',
    message: 'Your payment proof has been submitted and is pending admin verification. You will be notified once reviewed.',
    link: '/settings',
  },
  payment_approved: {
    title: 'Payment Verified!',
    message: 'Your platform fee payment has been verified. An OTP has been sent to unlock your account.',
    link: '/settings',
  },
  payment_rejected: {
    title: 'Payment Rejected',
    message: 'Your payment proof was rejected. Please review the feedback and submit a new proof.',
    link: '/settings',
  },
  otp_issued: {
    title: 'OTP Issued - Unlock Your Account',
    message: 'An OTP has been generated to unlock your account. Enter it on the locked account banner to restore access.',
    link: '/settings',
  },
  account_unlocked: {
    title: 'Account Unlocked!',
    message: 'Your account has been successfully unlocked. You can now access all platform features.',
    link: '/',
  },
};

export async function createFeeNotification(
  userId: string,
  type: FeeNotificationType,
  customMessage?: string
): Promise<{ error: Error | null }> {
  const content = notificationContent[type];
  
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type: `fee_${type}`,
        title: content.title,
        message: customMessage || content.message,
        link: content.link,
      }]);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Error creating fee notification:', err);
    return { error: err as Error };
  }
}

export async function forceDriverOffline(userId: string): Promise<void> {
  try {
    await supabase
      .from('driver_profiles')
      .update({ is_available: false })
      .eq('user_id', userId);
    
    console.log('Driver forced offline due to account lock');
  } catch (err) {
    console.error('Error forcing driver offline:', err);
  }
}
