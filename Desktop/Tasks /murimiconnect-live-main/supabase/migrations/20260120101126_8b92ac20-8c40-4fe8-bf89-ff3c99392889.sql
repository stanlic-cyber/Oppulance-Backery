-- Create delivery status enum
CREATE TYPE public.delivery_status AS ENUM (
  'open',
  'assigned',
  'pickup_confirmed',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'failed'
);

-- Create wallet transaction type enum
CREATE TYPE public.wallet_transaction_type AS ENUM ('topup', 'deduction');

-- Create driver_profiles table
CREATE TABLE public.driver_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  province TEXT NOT NULL,
  nearest_town TEXT,
  vehicle_type TEXT NOT NULL,
  vehicle_desc TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_wallets table
CREATE TABLE public.driver_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_usd NUMERIC NOT NULL DEFAULT 0 CHECK (balance_usd >= 0),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type wallet_transaction_type NOT NULL,
  amount_usd NUMERIC NOT NULL CHECK (amount_usd > 0),
  reason TEXT NOT NULL,
  related_delivery_id UUID,
  admin_id UUID,
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_requests table
CREATE TABLE public.delivery_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  pickup_province TEXT NOT NULL,
  pickup_town TEXT,
  dropoff_province TEXT NOT NULL,
  dropoff_town TEXT,
  cargo_type TEXT NOT NULL,
  cargo_quantity TEXT NOT NULL,
  cargo_weight TEXT,
  packaging_notes TEXT,
  preferred_pickup_time TEXT,
  special_instructions TEXT,
  status delivery_status NOT NULL DEFAULT 'open',
  assigned_driver_id UUID REFERENCES auth.users(id),
  agreed_price NUMERIC,
  platform_fee_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_bids table
CREATE TABLE public.delivery_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id),
  bid_price NUMERIC NOT NULL CHECK (bid_price > 0),
  eta_text TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, driver_id)
);

-- Create delivery_ratings table
CREATE TABLE public.delivery_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id),
  rater_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(delivery_request_id, rater_id)
);

-- Enable RLS on all tables
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;

-- Driver profiles policies
CREATE POLICY "Drivers can view their own profile"
ON public.driver_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Drivers can insert their own profile"
ON public.driver_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'driver'));

CREATE POLICY "Drivers can update their own profile"
ON public.driver_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view driver profiles for assigned deliveries"
ON public.driver_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.assigned_driver_id = driver_profiles.user_id
      AND (dr.buyer_id = auth.uid() OR dr.seller_id = auth.uid())
  )
);

CREATE POLICY "Admins can view all driver profiles"
ON public.driver_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Driver wallets policies
CREATE POLICY "Drivers can view their own wallet"
ON public.driver_wallets FOR SELECT
USING (auth.uid() = driver_id);

CREATE POLICY "System can create driver wallet"
ON public.driver_wallets FOR INSERT
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins can view all wallets"
ON public.driver_wallets FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update wallets"
ON public.driver_wallets FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Wallet transactions policies
CREATE POLICY "Drivers can view their own transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = driver_id);

CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can insert topup requests"
ON public.wallet_transactions FOR INSERT
WITH CHECK (auth.uid() = driver_id AND type = 'topup');

-- Delivery requests policies
CREATE POLICY "Buyers can create delivery requests for their orders"
ON public.delivery_requests FOR INSERT
WITH CHECK (
  auth.uid() = buyer_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.buyer_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view open delivery requests"
ON public.delivery_requests FOR SELECT
USING (
  status = 'open'
  AND has_role(auth.uid(), 'driver')
);

CREATE POLICY "Participants can view their delivery requests"
ON public.delivery_requests FOR SELECT
USING (
  auth.uid() = buyer_id
  OR auth.uid() = seller_id
  OR auth.uid() = assigned_driver_id
);

CREATE POLICY "Admins can view all delivery requests"
ON public.delivery_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Participants can update delivery requests"
ON public.delivery_requests FOR UPDATE
USING (
  auth.uid() = buyer_id
  OR auth.uid() = seller_id
  OR auth.uid() = assigned_driver_id
);

CREATE POLICY "Admins can update delivery requests"
ON public.delivery_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Delivery bids policies
CREATE POLICY "Drivers can create bids"
ON public.delivery_bids FOR INSERT
WITH CHECK (
  auth.uid() = driver_id
  AND has_role(auth.uid(), 'driver')
  AND EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.id = request_id AND dr.status = 'open'
  )
);

CREATE POLICY "Drivers can view their own bids"
ON public.delivery_bids FOR SELECT
USING (auth.uid() = driver_id);

CREATE POLICY "Buyers can view bids on their requests"
ON public.delivery_bids FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.id = request_id AND dr.buyer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all bids"
ON public.delivery_bids FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can update their own bids"
ON public.delivery_bids FOR UPDATE
USING (auth.uid() = driver_id);

-- Delivery ratings policies
CREATE POLICY "Participants can create ratings"
ON public.delivery_ratings FOR INSERT
WITH CHECK (
  auth.uid() = rater_id
  AND EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.id = delivery_request_id
      AND (dr.buyer_id = auth.uid() OR dr.seller_id = auth.uid())
      AND dr.status = 'completed'
  )
);

CREATE POLICY "Anyone can view ratings"
ON public.delivery_ratings FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_delivery_requests_status ON public.delivery_requests(status);
CREATE INDEX idx_delivery_requests_pickup_province ON public.delivery_requests(pickup_province);
CREATE INDEX idx_delivery_requests_created_at ON public.delivery_requests(created_at DESC);
CREATE INDEX idx_delivery_requests_buyer_id ON public.delivery_requests(buyer_id);
CREATE INDEX idx_delivery_requests_seller_id ON public.delivery_requests(seller_id);
CREATE INDEX idx_delivery_requests_assigned_driver_id ON public.delivery_requests(assigned_driver_id);

CREATE INDEX idx_delivery_bids_request_id ON public.delivery_bids(request_id);
CREATE INDEX idx_delivery_bids_driver_id ON public.delivery_bids(driver_id);
CREATE INDEX idx_delivery_bids_created_at ON public.delivery_bids(created_at DESC);

CREATE INDEX idx_wallet_transactions_driver_id ON public.wallet_transactions(driver_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

CREATE INDEX idx_driver_profiles_user_id ON public.driver_profiles(user_id);
CREATE INDEX idx_driver_profiles_province ON public.driver_profiles(province);

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_driver_profiles_updated_at
BEFORE UPDATE ON public.driver_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_wallets_updated_at
BEFORE UPDATE ON public.driver_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_requests_updated_at
BEFORE UPDATE ON public.delivery_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to deduct platform fee from driver wallet
CREATE OR REPLACE FUNCTION public.deduct_platform_fee(
  p_driver_id UUID,
  p_delivery_id UUID,
  p_amount NUMERIC DEFAULT 5.00
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance_usd INTO v_balance
  FROM public.driver_wallets
  WHERE driver_id = p_driver_id
  FOR UPDATE;

  -- Check if sufficient balance
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct from wallet
  UPDATE public.driver_wallets
  SET balance_usd = balance_usd - p_amount
  WHERE driver_id = p_driver_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (driver_id, type, amount_usd, reason, related_delivery_id)
  VALUES (p_driver_id, 'deduction', p_amount, 'Platform fee for delivery pickup confirmation', p_delivery_id);

  -- Mark delivery as fee paid
  UPDATE public.delivery_requests
  SET platform_fee_paid = true
  WHERE id = p_delivery_id;

  RETURN TRUE;
END;
$$;

-- Function to credit driver wallet (admin only)
CREATE OR REPLACE FUNCTION public.credit_driver_wallet(
  p_driver_id UUID,
  p_amount NUMERIC,
  p_admin_id UUID,
  p_reason TEXT DEFAULT 'Wallet top-up'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT has_role(p_admin_id, 'admin') THEN
    RETURN FALSE;
  END IF;

  -- Create wallet if not exists
  INSERT INTO public.driver_wallets (driver_id, balance_usd)
  VALUES (p_driver_id, 0)
  ON CONFLICT (driver_id) DO NOTHING;

  -- Credit wallet
  UPDATE public.driver_wallets
  SET balance_usd = balance_usd + p_amount
  WHERE driver_id = p_driver_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (driver_id, type, amount_usd, reason, admin_id)
  VALUES (p_driver_id, 'topup', p_amount, p_reason, p_admin_id);

  RETURN TRUE;
END;
$$;

-- Enable realtime for delivery tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_bids;