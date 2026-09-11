-- Fix PUBLIC_DATA_EXPOSURE: Payment settings publicly visible

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view payment settings" ON public.platform_payment_settings;

-- Create admin-only policy for full table access
CREATE POLICY "Admins can view payment settings"
ON public.platform_payment_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create public view for fee rates only (non-sensitive data)
CREATE OR REPLACE VIEW public.platform_fee_rates
WITH (security_invoker = true)
AS SELECT 
  currency,
  seller_fee_percent,
  driver_fee_percent
FROM public.platform_payment_settings
LIMIT 1;

-- Grant access to authenticated users
GRANT SELECT ON public.platform_fee_rates TO authenticated;

-- Create a SECURITY DEFINER function that returns payment details
-- ONLY for users who are in locked/awaiting_verification status
CREATE OR REPLACE FUNCTION public.get_payment_details_for_locked_user()
RETURNS TABLE (
  ecocash_name text,
  ecocash_number text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_branch text,
  currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return payment details if user has a locked or awaiting_verification status
  IF EXISTS (
    SELECT 1 FROM public.user_fee_balances
    WHERE user_id = auth.uid()
      AND status IN ('locked', 'awaiting_verification', 'otp_issued')
  ) THEN
    RETURN QUERY
    SELECT 
      pps.ecocash_name,
      pps.ecocash_number,
      pps.bank_name,
      pps.bank_account_name,
      pps.bank_account_number,
      pps.bank_branch,
      pps.currency
    FROM public.platform_payment_settings pps
    LIMIT 1;
  END IF;
  -- Returns empty if user is not locked
  RETURN;
END;
$$;

-- Fix SECURITY DEFINER function: check_and_lock_overdue_fees
-- Add admin check to prevent unauthorized calls
DROP FUNCTION IF EXISTS public.check_and_lock_overdue_fees();

CREATE OR REPLACE FUNCTION public.check_and_lock_overdue_fees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function should only be called by admins or system/cron jobs
  -- For cron jobs, auth.uid() will be null, so we allow that
  -- For direct calls, require admin role
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can run this function';
  END IF;

  UPDATE public.user_fee_balances
  SET status = 'locked',
      updated_at = now()
  WHERE status = 'active'
    AND current_balance > 0
    AND billing_start_date + INTERVAL '30 days' < now();
END;
$$;