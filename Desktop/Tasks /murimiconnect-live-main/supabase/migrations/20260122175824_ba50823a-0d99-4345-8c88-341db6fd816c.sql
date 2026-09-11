-- =====================================================
-- ADDITIONAL SECURITY HARDENING - PHASE 2
-- =====================================================

-- 1. FIX: Add explicit authentication requirements to all tables
-- This ensures unauthenticated users cannot query anything

-- Drop and recreate the delivery_ratings "Anyone can view ratings" to require auth
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.delivery_ratings;
CREATE POLICY "Authenticated users can view ratings"
ON public.delivery_ratings
FOR SELECT
TO authenticated
USING (true);

-- 2. FIX: Ensure driver_wallets has explicit auth requirements (already has good policies, but verify)
-- The existing policies are fine as they require driver_id = auth.uid() or admin role

-- 3. FIX: Ensure wallet_transactions has explicit auth requirements (already good)
-- The existing policies are fine as they require driver_id = auth.uid() or admin role

-- 4. FIX: Restrict driver_profiles_public view to authenticated users only
-- Revoke public access and require authentication
REVOKE SELECT ON public.driver_profiles_public FROM anon;
GRANT SELECT ON public.driver_profiles_public TO authenticated;

-- 5. FIX: Add policy to prevent unauthenticated profile access
-- Already has RLS enabled, but add explicit deny for anon by requiring auth.uid()
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 6. FIX: Remove phone from public driver view and make location less specific
DROP VIEW IF EXISTS public.driver_profiles_public;

CREATE VIEW public.driver_profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  name,
  province,
  -- nearest_town removed for privacy
  vehicle_type,
  vehicle_desc,
  is_available,
  average_rating,
  rating_count,
  total_deliveries,
  created_at
  -- phone is explicitly excluded for privacy
  -- nearest_town is excluded to reduce location precision
FROM public.driver_profiles;

-- Only authenticated users can access
GRANT SELECT ON public.driver_profiles_public TO authenticated;

-- 7. FIX: Add explicit row-level security policies for support_tickets
-- Already has good policies - owner or admin only

-- 8. VERIFY: Listings farmer_id exposure is intentional for marketplace
-- This is acceptable as farmers need to be identified for their listings
-- No change needed

-- 9. VERIFY: Delivery requests visibility to drivers is intentional
-- Drivers need to see open requests to bid on them
-- No change needed

-- 10. Add a policy to ensure profiles table requires authentication for all queries
-- The table already has specific policies, but let's ensure no fallthrough
-- All existing policies already use authenticated role or specific conditions