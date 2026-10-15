-- 1) Restrict fee balance updates: prevent users from self-unlocking or zeroing balances
DROP POLICY IF EXISTS "Users can update their own fee balance (proof submission)" ON public.user_fee_balances;
DROP POLICY IF EXISTS "Users can update their own fee balance" ON public.user_fee_balances;

-- Trigger guard: block changes to sensitive columns by non-admins
CREATE OR REPLACE FUNCTION public.guard_fee_balance_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.current_balance IS DISTINCT FROM OLD.current_balance
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.otp_code IS DISTINCT FROM OLD.otp_code
       OR NEW.billing_start_date IS DISTINCT FROM OLD.billing_start_date
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.user_type IS DISTINCT FROM OLD.user_type THEN
      RAISE EXCEPTION 'Not allowed to modify protected fee balance fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_fee_balance_update_trg ON public.user_fee_balances;
CREATE TRIGGER guard_fee_balance_update_trg
BEFORE UPDATE ON public.user_fee_balances
FOR EACH ROW EXECUTE FUNCTION public.guard_fee_balance_update();

CREATE POLICY "Users can update own fee balance proof fields"
  ON public.user_fee_balances
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Lock down check_and_lock_overdue_fees so anon cannot trigger it
REVOKE EXECUTE ON FUNCTION public.check_and_lock_overdue_fees() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_and_lock_overdue_fees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins (authenticated) may call; cron uses service_role which bypasses this check entirely.
  IF auth.uid() IS NULL OR NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.user_fee_balances
  SET status = 'locked',
      updated_at = now()
  WHERE status = 'active'
    AND current_balance > 0
    AND billing_start_date + INTERVAL '30 days' < now();
END;
$function$;

GRANT EXECUTE ON FUNCTION public.check_and_lock_overdue_fees() TO service_role;