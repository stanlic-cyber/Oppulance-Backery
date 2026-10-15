-- ============================================================
-- 1. ESCROW RACE CONDITION FIX
-- ============================================================
-- Prevent two escrow holds being created for the same order
ALTER TABLE public.escrow_holds
  ADD CONSTRAINT escrow_holds_order_id_unique UNIQUE (order_id);

-- ============================================================
-- 2. PERFORMANCE INDEXES (hot paths)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON public.orders(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_listing_status ON public.orders(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_listings_status_province ON public.listings(status, province);
CREATE INDEX IF NOT EXISTS idx_listings_farmer_status ON public.listings(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON public.listings(category, status);
CREATE INDEX IF NOT EXISTS idx_messages_order_created ON public.messages(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(order_id, sender_id, read_at);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created ON public.wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_buyer ON public.escrow_holds(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_seller ON public.escrow_holds(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON public.delivery_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_online ON public.driver_profiles(is_online, is_available, province);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON public.wallet_topup_requests(status, created_at DESC);

-- ============================================================
-- 3. WITHDRAWAL FLOW
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.withdrawal_method AS ENUM ('ecocash','bank');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected','paid','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add withdrawal entry types to wallet_ledger
DO $$ BEGIN
  ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'withdrawal_hold';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'withdrawal_paid';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'withdrawal_reversed';
EXCEPTION WHEN others THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.wallet_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_usd NUMERIC NOT NULL CHECK (amount_usd > 0),
  method public.withdrawal_method NOT NULL,
  -- payout details (kept simple, validated in RPC)
  ecocash_number TEXT,
  ecocash_name TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  hold_ledger_id UUID,
  paid_ledger_id UUID,
  reversed_ledger_id UUID,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.wallet_withdrawal_requests(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.wallet_withdrawal_requests(status, created_at);

ALTER TABLE public.wallet_withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals"
  ON public.wallet_withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all withdrawals"
  ON public.wallet_withdrawal_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update withdrawals"
  ON public.wallet_withdrawal_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- INSERT happens only via RPC (security definer), so no INSERT policy.

-- Trigger to keep updated_at fresh
CREATE TRIGGER trg_withdrawals_updated_at
BEFORE UPDATE ON public.wallet_withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- RPC: request withdrawal (debits wallet immediately as a hold)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_method public.withdrawal_method,
  p_ecocash_number TEXT DEFAULT NULL,
  p_ecocash_name TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_bank_account_name TEXT DEFAULT NULL,
  p_bank_account_number TEXT DEFAULT NULL,
  p_bank_branch TEXT DEFAULT NULL
)
RETURNS UUID
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

  -- Throttle: max 1 pending withdrawal at a time
  IF EXISTS (
    SELECT 1 FROM public.wallet_withdrawal_requests
    WHERE user_id = v_user AND status IN ('pending','approved')
  ) THEN
    RAISE EXCEPTION 'You already have a withdrawal in progress';
  END IF;

  -- Debit wallet now (funds held). If wallet_debit fails (insufficient balance), it raises.
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

  -- Update the ledger row's reference_id to point to the withdrawal
  UPDATE public.wallet_ledger SET reference_id = v_id WHERE id = v_ledger;

  RETURN v_id;
END;
$$;

-- ---- RPC: cancel own pending withdrawal (refund the hold)
CREATE OR REPLACE FUNCTION public.cancel_withdrawal(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE w RECORD; v_ledger UUID;
BEGIN
  SELECT * INTO w FROM public.wallet_withdrawal_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF w.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not your withdrawal'; END IF;
  IF w.status <> 'pending' THEN RAISE EXCEPTION 'Cannot cancel %', w.status; END IF;

  v_ledger := public.wallet_credit(
    w.user_id, w.amount_usd, 'withdrawal_reversed', 'wallet_withdrawal', w.id,
    'Withdrawal cancelled by user', w.user_id
  );
  UPDATE public.wallet_withdrawal_requests
    SET status='cancelled', reversed_ledger_id=v_ledger, updated_at=now()
    WHERE id = p_id;
  RETURN TRUE;
END;
$$;

-- ---- RPC: admin approves and marks paid (atomic — funds were already debited at request time)
CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(p_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE w RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can mark withdrawals as paid';
  END IF;
  SELECT * INTO w FROM public.wallet_withdrawal_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF w.status NOT IN ('pending','approved') THEN
    RAISE EXCEPTION 'Withdrawal is %', w.status;
  END IF;

  UPDATE public.wallet_withdrawal_requests
    SET status='paid', reviewed_by=auth.uid(), reviewed_at=now(),
        paid_at=now(), admin_notes=p_admin_notes, updated_at=now()
    WHERE id = p_id;
  RETURN TRUE;
END;
$$;

-- ---- RPC: admin rejects (refund the hold)
CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_id UUID, p_admin_notes TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE w RECORD; v_ledger UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject withdrawals';
  END IF;
  IF p_admin_notes IS NULL OR length(trim(p_admin_notes)) < 3 THEN
    RAISE EXCEPTION 'Please provide a rejection reason';
  END IF;

  SELECT * INTO w FROM public.wallet_withdrawal_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF w.status <> 'pending' THEN RAISE EXCEPTION 'Cannot reject %', w.status; END IF;

  v_ledger := public.wallet_credit(
    w.user_id, w.amount_usd, 'withdrawal_reversed', 'wallet_withdrawal', w.id,
    'Withdrawal rejected: ' || p_admin_notes, auth.uid()
  );
  UPDATE public.wallet_withdrawal_requests
    SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(),
        admin_notes=p_admin_notes, reversed_ledger_id=v_ledger, updated_at=now()
    WHERE id = p_id;
  RETURN TRUE;
END;
$$;

-- ============================================================
-- 4. ORDER AUTO-EXPIRY
-- ============================================================
-- Cancels orders that have been pending > 48h and refunds escrow.
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Only admins or system (cron, auth.uid() IS NULL) may run
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR r IN
    SELECT id, buyer_id
    FROM public.orders
    WHERE status = 'pending'
      AND created_at < now() - INTERVAL '48 hours'
    LIMIT 200
  LOOP
    -- Refund escrow if held
    IF EXISTS (SELECT 1 FROM public.escrow_holds WHERE order_id = r.id AND status = 'held') THEN
      BEGIN
        PERFORM public.wallet_credit(
          (SELECT buyer_id FROM public.escrow_holds WHERE order_id = r.id),
          (SELECT amount_usd FROM public.escrow_holds WHERE order_id = r.id),
          'escrow_refund', 'escrow_hold',
          (SELECT id FROM public.escrow_holds WHERE order_id = r.id),
          'Auto-refund: order expired after 48h pending',
          NULL
        );
        UPDATE public.escrow_holds
          SET status='refunded', refunded_at=now()
          WHERE order_id = r.id;
      EXCEPTION WHEN others THEN
        -- Skip this order if refund fails; admin will see it
        CONTINUE;
      END;
    END IF;

    UPDATE public.orders
      SET status='cancelled', cancelled_at=now(), updated_at=now()
      WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;