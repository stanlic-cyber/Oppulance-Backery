-- Fix the security definer view by dropping it and using SECURITY INVOKER
DROP VIEW IF EXISTS public.driver_profiles_public;

-- Create view with SECURITY INVOKER (default, but explicit for clarity)
CREATE VIEW public.driver_profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  name,
  province,
  nearest_town,
  vehicle_type,
  vehicle_desc,
  is_available,
  average_rating,
  rating_count,
  total_deliveries,
  created_at
  -- phone intentionally excluded for privacy
FROM public.driver_profiles
WHERE is_available = true;