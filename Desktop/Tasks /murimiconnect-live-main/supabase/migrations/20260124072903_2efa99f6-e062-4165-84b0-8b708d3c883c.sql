-- =====================================================
-- COLUMN-LEVEL SECURITY: HIDE EMAIL/PHONE FROM PROFILES
-- =====================================================

-- Create a safe profiles view that excludes sensitive contact info
-- This view will be used for counterparty lookups
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS SELECT 
  id,
  name,
  province,
  nearest_town,
  farm_name,
  avatar_url,
  verified,
  created_at,
  updated_at
  -- Excluded: email, phone, suspended fields, preferred_language
FROM public.profiles;

-- Grant access to authenticated users only
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;
GRANT SELECT ON public.profiles_public TO authenticated;

-- Update driver_profiles_public to explicitly exclude phone again (paranoid check)
DROP VIEW IF EXISTS public.driver_profiles_public;
CREATE VIEW public.driver_profiles_public 
WITH (security_invoker = true)
AS SELECT 
  id,
  user_id,
  name,
  province,
  -- Explicitly exclude: phone, nearest_town
  vehicle_type,
  vehicle_desc,
  is_available,
  average_rating,
  rating_count,
  total_deliveries,
  created_at
FROM public.driver_profiles;

-- Restrict to authenticated only
REVOKE ALL ON public.driver_profiles_public FROM anon;
REVOKE ALL ON public.driver_profiles_public FROM public;
GRANT SELECT ON public.driver_profiles_public TO authenticated;

-- The main driver_profiles table with phone is only accessible via strict RLS
-- which we already set up for active accepted requests only