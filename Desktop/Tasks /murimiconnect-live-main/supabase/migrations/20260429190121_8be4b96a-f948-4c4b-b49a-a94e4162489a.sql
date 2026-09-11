-- Rate limiting infrastructure
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(identifier, action, created_at DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view rate limits" ON public.rate_limits
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper: check & record rate limit. Returns true if allowed, false if exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_attempts INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > now() - (p_window_seconds || ' seconds')::interval;

  IF v_count >= p_max_attempts THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.rate_limits (identifier, action) VALUES (p_identifier, p_action);
  RETURN TRUE;
END;
$$;

-- Add rate limiting to request_withdrawal: max 5 per user per hour
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_method withdrawal_method,
  p_ecocash_number text DEFAULT NULL::text,
  p_ecocash_name text DEFAULT NULL::text,
  p_bank_name text DEFAULT NULL::text,
  p_bank_account_name text DEFAULT NULL::text,
  p_bank_account_number text DEFAULT NULL::text,
  p_bank_branch text DEFAULT NULL::text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id UUID;
  v_ledger UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Rate limit: max 5 withdrawal attempts per hour per user
  IF NOT public.check_rate_limit(v_user::text, 'withdrawal_request', 5, 3600) THEN
    RAISE EXCEPTION 'Too many withdrawal attempts. Please try again later.';
  END IF;

  IF p_amount IS NULL OR p_amount < 5 THEN RAISE EXCEPTION 'Minimum withdrawal is $5.00'; END IF;
  IF p_amount > 10000 THEN RAISE EXCEPTION 'Maximum withdrawal is $10,000.00 — please contact support for larger amounts'; END IF;

  IF p_method = 'ecocash' THEN
    IF p_ecocash_number IS NULL OR length(trim(p_ecocash_number)) < 9 THEN
      RAISE EXCEPTION 'Valid EcoCash number required';
    END IF;
    IF p_ecocash_name IS NULL OR length(trim(p_ecocash_name)) < 2 THEN
      RAISE EXCEPTION 'EcoCash account name required';
    END IF;
  ELSIF p_method = 'bank' THEN
    IF p_bank_name IS NULL OR p_bank_account_number IS NULL OR p_bank_account_name IS NULL THEN
      RAISE EXCEPTION 'Bank name, account name and account number are all required';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wallet_withdrawal_requests
    WHERE user_id = v_user AND status IN ('pending','approved')
  ) THEN
    RAISE EXCEPTION 'You already have a withdrawal in progress';
  END IF;

  v_ledger := public.wallet_debit(
    v_user, p_amount, 'withdrawal_hold', 'wallet_withdrawal', NULL,
    'Withdrawal hold pending admin approval', v_user
  );

  INSERT INTO public.wallet_withdrawal_requests (
    user_id, amount_usd, method, hold_ledger_id,
    ecocash_number, ecocash_name,
    bank_name, bank_account_name, bank_account_number, bank_branch
  ) VALUES (
    v_user, p_amount, p_method, v_ledger,
    p_ecocash_number, p_ecocash_name,
    p_bank_name, p_bank_account_name, p_bank_account_number, p_bank_branch
  ) RETURNING id INTO v_id;

  UPDATE public.wallet_ledger SET reference_id = v_id WHERE id = v_ledger;
  RETURN v_id;
END;
$$;

-- Cleanup function for old rate limit records (cron-friendly)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE created_at < now() - INTERVAL '24 hours';
$$;

-- Public health/status read-only function (safe aggregate, no PII)
CREATE OR REPLACE FUNCTION public.get_platform_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_listings INT;
  v_orders_24h INT;
  v_open_disputes INT;
  v_pending_topups INT;
  v_pending_withdrawals INT;
BEGIN
  SELECT COUNT(*) INTO v_active_listings FROM public.listings WHERE status = 'active';
  SELECT COUNT(*) INTO v_orders_24h FROM public.orders WHERE created_at > now() - INTERVAL '24 hours';
  SELECT COUNT(*) INTO v_open_disputes FROM public.escrow_disputes WHERE status = 'open';
  SELECT COUNT(*) INTO v_pending_topups FROM public.wallet_topup_requests WHERE status = 'pending';
  SELECT COUNT(*) INTO v_pending_withdrawals FROM public.wallet_withdrawal_requests WHERE status = 'pending';

  RETURN jsonb_build_object(
    'database', 'healthy',
    'timestamp', now(),
    'metrics', jsonb_build_object(
      'active_listings', v_active_listings,
      'orders_24h', v_orders_24h,
      'open_disputes', v_open_disputes,
      'pending_topups', v_pending_topups,
      'pending_withdrawals', v_pending_withdrawals
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_health() TO anon, authenticated;