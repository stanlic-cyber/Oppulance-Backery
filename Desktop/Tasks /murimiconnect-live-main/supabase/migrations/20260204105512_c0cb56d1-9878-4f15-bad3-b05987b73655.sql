-- Add new columns to driver_profiles for presence system
ALTER TABLE public.driver_profiles
ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS current_status text NOT NULL DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();

-- Create index for faster queries on online drivers
CREATE INDEX IF NOT EXISTS idx_driver_profiles_online_status 
ON public.driver_profiles (is_online, current_status) 
WHERE is_online = true;

-- Update the driver_profiles_public view to include new presence fields
DROP VIEW IF EXISTS public.driver_profiles_public;
CREATE VIEW public.driver_profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  name,
  province,
  vehicle_type,
  vehicle_desc,
  is_available,
  is_online,
  current_status,
  last_seen,
  average_rating,
  rating_count,
  total_deliveries,
  created_at
FROM public.driver_profiles;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.driver_profiles_public TO authenticated;

-- Add RLS policy for buyers and sellers to view online drivers
CREATE POLICY "Buyers and sellers can view online drivers"
ON public.driver_profiles
FOR SELECT
USING (
  is_online = true 
  AND is_available = true 
  AND (
    has_role(auth.uid(), 'buyer'::app_role) 
    OR has_role(auth.uid(), 'farmer'::app_role)
  )
);

-- Enable realtime for driver_profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_profiles;