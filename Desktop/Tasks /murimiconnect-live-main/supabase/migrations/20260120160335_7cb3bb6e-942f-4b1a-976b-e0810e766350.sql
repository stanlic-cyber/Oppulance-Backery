-- Driver location tracking table for real-time GPS
CREATE TABLE public.driver_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL UNIQUE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  heading numeric,
  speed numeric,
  is_available boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drivers can update their own location
CREATE POLICY "Drivers can insert their own location"
ON public.driver_locations
FOR INSERT
WITH CHECK (auth.uid() = driver_id AND has_role(auth.uid(), 'driver'::app_role));

CREATE POLICY "Drivers can update their own location"
ON public.driver_locations
FOR UPDATE
USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can view their own location"
ON public.driver_locations
FOR SELECT
USING (auth.uid() = driver_id);

-- Participants of a delivery can view driver location
CREATE POLICY "Delivery participants can view driver location"
ON public.driver_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.assigned_driver_id = driver_locations.driver_id
      AND (dr.buyer_id = auth.uid() OR dr.seller_id = auth.uid())
      AND dr.status IN ('assigned', 'pickup_confirmed', 'in_transit')
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all driver locations"
ON public.driver_locations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for driver locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- In-app notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can create notifications (via edge functions / triggers)
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for fast notification queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_driver_locations_driver ON public.driver_locations(driver_id);

-- Add is_available to driver_profiles for availability toggle
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- Add total_earnings to driver_profiles for earnings dashboard
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS total_earnings_usd numeric NOT NULL DEFAULT 0;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS total_deliveries integer NOT NULL DEFAULT 0;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS average_rating numeric;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;