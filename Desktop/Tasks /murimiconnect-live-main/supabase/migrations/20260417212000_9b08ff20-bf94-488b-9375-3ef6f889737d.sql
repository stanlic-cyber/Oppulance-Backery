
-- =====================================================================
-- WALLET & ESCROW SYSTEM
-- =====================================================================

-- ----- ENUMS -----
CREATE TYPE public.wallet_ledger_type AS ENUM (
  'topup',
  'escrow_lock',
  'escrow_release',
  'escrow_refund',
  'fee_deduction',
  'adjustment'
);

CREATE TYPE public.topup_method AS ENUM ('ecocash', 'onemoney', 'bank');
CREATE TYPE public.topup_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE public.escrow_status AS ENUM (
  'held',
  'released',
  'refunded',
  'disputed'
);

CREATE TYPE public.dispute_status AS ENUM (
  'open',
  'resolved_release',
  'resolved_refund',
  'cancelled'
);

-- ----- TABLES -----

CREATE TABLE public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance_usd NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance_usd >= 0),
  frozen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.wallet_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  entry_type public.wallet_ledger_type NOT NULL,
  amount_usd NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_ledger_user ON public.wallet_ledger(user_id, created_at DESC);
CREATE INDEX idx_wallet_ledger_ref ON public.wallet_ledger(reference_type, reference_id);

CREATE TABLE public.wallet_topup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_usd NUMERIC(14,2) NOT NULL CHECK (amount_usd > 0),
  method public.topup_method NOT NULL,
  payment_reference TEXT NOT NULL,
  proof_url TEXT,
  status public.topup_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_topup_user ON public.wallet_topup_requests(user_id, created_at DESC);
CREATE INDEX idx_topup_status ON public.wallet_topup_requests(status, created_at DESC);

CREATE TABLE public.escrow_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount_usd NUMERIC(14,2) NOT NULL CHECK (amount_usd > 0),
  status public.escrow_status NOT NULL DEFAULT 'held',
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  release_ledger_id UUID,
  refund_ledger_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_escrow_buyer ON public.escrow_holds(buyer_id);
CREATE INDEX idx_escrow_seller ON public.escrow_holds(seller_id);
CREATE INDEX idx_escrow_status ON public.escrow_holds(status);

CREATE TABLE public.escrow_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_hold_id UUID NOT NULL REFERENCES public.escrow_holds(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dispute_escrow ON public.escrow_disputes(escrow_hold_id);
CREATE INDEX idx_dispute_status ON public.escrow_disputes(status);

-- ----- TIMESTAMP TRIGGERS -----
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_topup_updated BEFORE UPDATE ON public.wallet_topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_escrow_updated BEFORE UPDATE ON public.escrow_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dispute_updated BEFORE UPDATE ON public.escrow_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----- ENABLE RLS -----
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;

-- ----- RLS: user_wallets (READ ONLY for users; writes only via SECURITY DEFINER fns) -----
CREATE POLICY "Users view own wallet" ON public.user_wallets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.user_wallets
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
-- No INSERT/UPDATE/DELETE policies → blocks direct writes; functions use SECURITY DEFINER to bypass.

-- ----- RLS: wallet_ledger (READ ONLY) -----
CREATE POLICY "Users view own ledger" ON public.wallet_ledger
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all ledger" ON public.wallet_ledger
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ----- RLS: wallet_topup_requests -----
CREATE POLICY "Users view own topups" ON public.wallet_topup_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all topups" ON public.wallet_topup_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own topups" ON public.wallet_topup_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users update own pending topups" ON public.wallet_topup_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update topups" ON public.wallet_topup_requests
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- ----- RLS: escrow_holds (read for participants & admin; writes via fns) -----
CREATE POLICY "Buyer views own escrow" ON public.escrow_holds
  FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Seller views own escrow" ON public.escrow_holds
  FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Admins view all escrow" ON public.escrow_holds
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ----- RLS: escrow_disputes -----
CREATE POLICY "Participants view dispute" ON public.escrow_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.escrow_holds eh
      WHERE eh.id = escrow_disputes.escrow_hold_id
        AND (eh.buyer_id = auth.uid() OR eh.seller_id = auth.uid())
    )
  );
CREATE POLICY "Admins view all disputes" ON public.escrow_disputes
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update disputes" ON public.escrow_disputes
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- SECURE FUNCTIONS — all money movement
-- =====================================================================

-- Internal: ensure wallet exists (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_wallet(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.user_wallets (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_id FROM public.user_wallets WHERE user_id = p_user_id;
  RETURN v_id;
END;
$$;

-- Internal: credit a wallet + write ledger (atomic)
CREATE OR REPLACE FUNCTION public.wallet_credit(
  p_user_id UUID,
  p_amount NUMERIC,
  p_entry_type public.wallet_ledger_type,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_created_by UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_ledger_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  v_wallet_id := public.ensure_wallet(p_user_id);

  UPDATE public.user_wallets
    SET balance_usd = balance_usd + p_amount, updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance_usd INTO v_new_balance;

  INSERT INTO public.wallet_ledger (
    user_id, wallet_id, entry_type, amount_usd, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_user_id, v_wallet_id, p_entry_type, p_amount, v_new_balance,
    p_reference_type, p_reference_id, p_description, p_created_by
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$;

-- Internal: debit a wallet + write ledger (atomic, balance check)
CREATE OR REPLACE FUNCTION public.wallet_debit(
  p_user_id UUID,
  p_amount NUMERIC,
  p_entry_type public.wallet_ledger_type,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_created_by UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
  v_frozen BOOLEAN;
  v_ledger_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  v_wallet_id := public.ensure_wallet(p_user_id);

  SELECT balance_usd, frozen INTO v_balance, v_frozen
    FROM public.user_wallets WHERE id = v_wallet_id FOR UPDATE;

  IF v_frozen THEN RAISE EXCEPTION 'Wallet is frozen'; END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_balance, p_amount;
  END IF;

  UPDATE public.user_wallets
    SET balance_usd = balance_usd - p_amount, updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance_usd INTO v_new_balance;

  INSERT INTO public.wallet_ledger (
    user_id, wallet_id, entry_type, amount_usd, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_user_id, v_wallet_id, p_entry_type, -p_amount, v_new_balance,
    p_reference_type, p_reference_id, p_description, p_created_by
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$;

-- Admin: approve a top-up → credit user wallet
CREATE OR REPLACE FUNCTION public.approve_topup(p_topup_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve top-ups';
  END IF;

  SELECT * INTO r FROM public.wallet_topup_requests WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Top-up already %', r.status; END IF;

  PERFORM public.wallet_credit(
    r.user_id, r.amount_usd, 'topup', 'wallet_topup_request', r.id,
    'Top-up via ' || r.method || ' ref ' || r.payment_reference, auth.uid()
  );

  UPDATE public.wallet_topup_requests
    SET status = 'approved', admin_notes = p_admin_notes,
        reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_topup_id;

  RETURN TRUE;
END;
$$;

-- Admin: reject a top-up
CREATE OR REPLACE FUNCTION public.reject_topup(p_topup_id UUID, p_admin_notes TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject top-ups';
  END IF;

  UPDATE public.wallet_topup_requests
    SET status = 'rejected', admin_notes = p_admin_notes,
        reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_topup_id AND status = 'pending';

  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up not found or already processed'; END IF;
  RETURN TRUE;
END;
$$;

-- Buyer: lock funds in escrow (called when placing an order)
CREATE OR REPLACE FUNCTION public.escrow_lock(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  v_seller_id UUID;
  v_amount NUMERIC;
  v_hold_id UUID;
BEGIN
  SELECT o.id, o.buyer_id, o.total_amount, o.subtotal, l.farmer_id
    INTO o
    FROM public.orders o
    JOIN public.listings l ON l.id = o.listing_id
    WHERE o.id = p_order_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.buyer_id <> auth.uid() THEN RAISE EXCEPTION 'Only the buyer can lock escrow'; END IF;

  v_seller_id := o.farmer_id;
  v_amount := COALESCE(o.total_amount, o.subtotal);
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Invalid order amount'; END IF;

  IF EXISTS (SELECT 1 FROM public.escrow_holds WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Escrow already exists for this order';
  END IF;

  PERFORM public.wallet_debit(
    o.buyer_id, v_amount, 'escrow_lock', 'order', p_order_id,
    'Funds held in escrow for order', auth.uid()
  );

  INSERT INTO public.escrow_holds (order_id, buyer_id, seller_id, amount_usd)
  VALUES (p_order_id, o.buyer_id, v_seller_id, v_amount)
  RETURNING id INTO v_hold_id;

  RETURN v_hold_id;
END;
$$;

-- Buyer: release escrow to seller (on delivery confirmation)
CREATE OR REPLACE FUNCTION public.escrow_release(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h RECORD;
  v_ledger UUID;
BEGIN
  SELECT * INTO h FROM public.escrow_holds WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF h.status <> 'held' THEN RAISE EXCEPTION 'Escrow status is %', h.status; END IF;
  IF auth.uid() <> h.buyer_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only the buyer or an admin can release escrow';
  END IF;

  v_ledger := public.wallet_credit(
    h.seller_id, h.amount_usd, 'escrow_release', 'escrow_hold', h.id,
    'Escrow released for completed order', auth.uid()
  );

  UPDATE public.escrow_holds
    SET status = 'released', released_at = now(), release_ledger_id = v_ledger
    WHERE id = h.id;

  RETURN TRUE;
END;
$$;

-- Refund escrow to buyer (admin or auto on cancellation)
CREATE OR REPLACE FUNCTION public.escrow_refund(p_order_id UUID, p_reason TEXT DEFAULT 'Order cancelled')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h RECORD;
  v_ledger UUID;
BEGIN
  SELECT * INTO h FROM public.escrow_holds WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF h.status NOT IN ('held','disputed') THEN RAISE EXCEPTION 'Escrow status is %', h.status; END IF;
  IF auth.uid() <> h.seller_id
     AND auth.uid() <> h.buyer_id
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized to refund this escrow';
  END IF;
  -- Buyers can only self-refund if order is still pending (not yet accepted)
  IF auth.uid() = h.buyer_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'Buyer can only refund pending orders';
    END IF;
  END IF;

  v_ledger := public.wallet_credit(
    h.buyer_id, h.amount_usd, 'escrow_refund', 'escrow_hold', h.id,
    p_reason, auth.uid()
  );

  UPDATE public.escrow_holds
    SET status = 'refunded', refunded_at = now(), refund_ledger_id = v_ledger
    WHERE id = h.id;

  RETURN TRUE;
END;
$$;

-- Buyer or seller: raise a dispute on a held escrow
CREATE OR REPLACE FUNCTION public.raise_dispute(
  p_order_id UUID, p_reason TEXT, p_details TEXT DEFAULT NULL, p_evidence_urls TEXT[] DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h RECORD;
  v_dispute_id UUID;
BEGIN
  SELECT * INTO h FROM public.escrow_holds WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF h.status <> 'held' THEN RAISE EXCEPTION 'Cannot dispute escrow in status %', h.status; END IF;
  IF auth.uid() <> h.buyer_id AND auth.uid() <> h.seller_id THEN
    RAISE EXCEPTION 'Only buyer or seller can raise a dispute';
  END IF;

  UPDATE public.escrow_holds SET status = 'disputed' WHERE id = h.id;

  INSERT INTO public.escrow_disputes (escrow_hold_id, raised_by, reason, details, evidence_urls)
  VALUES (h.id, auth.uid(), p_reason, p_details, p_evidence_urls)
  RETURNING id INTO v_dispute_id;

  RETURN v_dispute_id;
END;
$$;

-- Admin: resolve dispute → release to seller OR refund to buyer
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id UUID, p_outcome TEXT, p_admin_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  h RECORD;
  v_new_status public.dispute_status;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;
  IF p_outcome NOT IN ('release','refund') THEN
    RAISE EXCEPTION 'Outcome must be release or refund';
  END IF;

  SELECT * INTO d FROM public.escrow_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF d.status <> 'open' THEN RAISE EXCEPTION 'Dispute already %', d.status; END IF;

  SELECT * INTO h FROM public.escrow_holds WHERE id = d.escrow_hold_id FOR UPDATE;

  IF p_outcome = 'release' THEN
    PERFORM public.wallet_credit(
      h.seller_id, h.amount_usd, 'escrow_release', 'escrow_hold', h.id,
      'Dispute resolved in seller favor', auth.uid()
    );
    UPDATE public.escrow_holds SET status='released', released_at=now() WHERE id=h.id;
    v_new_status := 'resolved_release';
  ELSE
    PERFORM public.wallet_credit(
      h.buyer_id, h.amount_usd, 'escrow_refund', 'escrow_hold', h.id,
      'Dispute resolved in buyer favor', auth.uid()
    );
    UPDATE public.escrow_holds SET status='refunded', refunded_at=now() WHERE id=h.id;
    v_new_status := 'resolved_refund';
  END IF;

  UPDATE public.escrow_disputes
    SET status = v_new_status, admin_notes = p_admin_notes,
        resolved_by = auth.uid(), resolved_at = now()
    WHERE id = p_dispute_id;

  RETURN TRUE;
END;
$$;

-- =====================================================================
-- STORAGE: top-up payment proofs
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('topup-proofs', 'topup-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own topup proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'topup-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users view own topup proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'topup-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins view all topup proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'topup-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users delete own pending proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'topup-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
