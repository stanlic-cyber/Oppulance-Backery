
-- 1. RPC: submit payment proof (bypasses trigger via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.submit_fee_payment_proof(p_proof_url TEXT, p_reference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_rows INT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_proof_url IS NULL OR length(trim(p_proof_url)) = 0 THEN
    RAISE EXCEPTION 'Proof URL required';
  END IF;

  UPDATE public.user_fee_balances
    SET payment_proof_url = p_proof_url,
        payment_reference = p_reference,
        proof_submitted_at = now(),
        status = 'awaiting_verification',
        updated_at = now()
  WHERE user_id = v_user
    AND status IN ('locked','otp_issued','awaiting_verification');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_fee_payment_proof(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_fee_payment_proof(TEXT, TEXT) TO authenticated;

-- 2. RPC: verify OTP server-side and unlock
CREATE OR REPLACE FUNCTION public.verify_fee_otp(p_otp TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_row public.user_fee_balances%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_otp IS NULL OR length(trim(p_otp)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP required');
  END IF;

  -- Brute-force protection
  IF NOT public.check_rate_limit(v_user::text, 'verify_fee_otp', 10, 600) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many attempts. Try again later.');
  END IF;

  SELECT * INTO v_row
  FROM public.user_fee_balances
  WHERE user_id = v_user
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No fee balance found');
  END IF;
  IF v_row.otp_code IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No OTP issued');
  END IF;
  IF v_row.otp_expires_at IS NULL OR v_row.otp_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP has expired');
  END IF;
  IF v_row.otp_code <> trim(p_otp) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid OTP');
  END IF;

  UPDATE public.user_fee_balances
    SET status = 'active',
        current_balance = 0,
        billing_start_date = now(),
        otp_code = NULL,
        otp_expires_at = NULL,
        payment_proof_url = NULL,
        payment_reference = NULL,
        proof_submitted_at = NULL,
        verification_notes = NULL,
        updated_at = now()
  WHERE id = v_row.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_fee_otp(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_fee_otp(TEXT) TO authenticated;

-- 3. Hide otp_code / otp_expires_at from client SELECT.
--    Revoke column-level SELECT from anon + authenticated.
REVOKE SELECT (otp_code, otp_expires_at) ON public.user_fee_balances FROM anon, authenticated, PUBLIC;
