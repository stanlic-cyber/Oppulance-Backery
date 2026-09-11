-- Platform payment settings (admin-configurable)
CREATE TABLE public.platform_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecocash_name text,
  ecocash_number text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_branch text,
  currency text NOT NULL DEFAULT 'USD',
  seller_fee_percent numeric NOT NULL DEFAULT 5.0,
  driver_fee_percent numeric NOT NULL DEFAULT 5.0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.platform_payment_settings ENABLE ROW LEVEL SECURITY;

-- Only one row allowed (singleton pattern)
CREATE UNIQUE INDEX platform_payment_settings_singleton ON public.platform_payment_settings ((true));

-- Insert default settings
INSERT INTO public.platform_payment_settings (currency, seller_fee_percent, driver_fee_percent)
VALUES ('USD', 5.0, 5.0);

-- RLS policies for platform_payment_settings
CREATE POLICY "Anyone can view payment settings"
ON public.platform_payment_settings FOR SELECT
USING (true);

CREATE POLICY "Only admins can update payment settings"
ON public.platform_payment_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- User fee balances (for sellers and drivers)
CREATE TYPE public.fee_status AS ENUM ('active', 'locked', 'awaiting_verification', 'otp_issued');

CREATE TABLE public.user_fee_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('seller', 'driver')),
  current_balance numeric NOT NULL DEFAULT 0,
  billing_start_date timestamptz NOT NULL DEFAULT now(),
  status fee_status NOT NULL DEFAULT 'active',
  payment_proof_url text,
  payment_reference text,
  proof_submitted_at timestamptz,
  verification_notes text,
  otp_code text,
  otp_expires_at timestamptz,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, user_type)
);

-- Enable RLS
ALTER TABLE public.user_fee_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_fee_balances
CREATE POLICY "Users can view their own fee balance"
ON public.user_fee_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fee balances"
ON public.user_fee_balances FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own fee balance (proof submission)"
ON public.user_fee_balances FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any fee balance"
ON public.user_fee_balances FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert fee balance"
ON public.user_fee_balances FOR INSERT
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Fee transaction history
CREATE TABLE public.fee_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('seller', 'driver')),
  order_id uuid,
  delivery_request_id uuid,
  amount numeric NOT NULL,
  fee_percent numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for fee_transactions
CREATE POLICY "Users can view their own fee transactions"
ON public.fee_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fee transactions"
ON public.fee_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert fee transactions"
ON public.fee_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Function to check if user is locked
CREATE OR REPLACE FUNCTION public.is_user_locked(p_user_id uuid, p_user_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_fee_balances
    WHERE user_id = p_user_id
      AND user_type = p_user_type
      AND status = 'locked'
  )
$$;

-- Function to add platform fee to user balance
CREATE OR REPLACE FUNCTION public.add_platform_fee(
  p_user_id uuid,
  p_user_type text,
  p_amount numeric,
  p_fee_percent numeric,
  p_order_id uuid DEFAULT NULL,
  p_delivery_request_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create balance record if not exists
  INSERT INTO public.user_fee_balances (user_id, user_type, current_balance, billing_start_date)
  VALUES (p_user_id, p_user_type, 0, now())
  ON CONFLICT (user_id, user_type) DO NOTHING;
  
  -- Add fee to balance
  UPDATE public.user_fee_balances
  SET current_balance = current_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND user_type = p_user_type;
  
  -- Record transaction
  INSERT INTO public.fee_transactions (user_id, user_type, order_id, delivery_request_id, amount, fee_percent, description)
  VALUES (p_user_id, p_user_type, p_order_id, p_delivery_request_id, p_amount, p_fee_percent, p_description);
END;
$$;

-- Function to check and lock users after 30 days
CREATE OR REPLACE FUNCTION public.check_and_lock_overdue_fees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_fee_balances
  SET status = 'locked',
      updated_at = now()
  WHERE status = 'active'
    AND current_balance > 0
    AND billing_start_date + INTERVAL '30 days' < now();
END;
$$;

-- Indexes for performance
CREATE INDEX idx_user_fee_balances_user ON public.user_fee_balances(user_id);
CREATE INDEX idx_user_fee_balances_status ON public.user_fee_balances(status);
CREATE INDEX idx_fee_transactions_user ON public.fee_transactions(user_id);

-- Enable realtime for fee balances
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_fee_balances;