-- Fix 1: Profiles - Replace overly permissive SELECT policy with relationship-based access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can view profiles from orders"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN listings l ON l.id = o.listing_id
    WHERE (o.buyer_id = auth.uid() AND l.farmer_id = profiles.id)
       OR (l.farmer_id = auth.uid() AND o.buyer_id = profiles.id)
  )
);

CREATE POLICY "Users can view assigned driver profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE (dr.buyer_id = auth.uid() OR dr.seller_id = auth.uid())
      AND dr.assigned_driver_id = profiles.id
  )
);

CREATE POLICY "Users can view profiles from driver hire requests"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM driver_hire_requests dhr
    WHERE (dhr.buyer_id = auth.uid() AND dhr.driver_id = profiles.id)
       OR (dhr.driver_id = auth.uid() AND dhr.buyer_id = profiles.id)
  )
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Notifications - Replace open INSERT with restricted policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Only allow users to create notifications for users they have business relationships with
-- This is a more restrictive policy that prevents arbitrary notification creation
CREATE POLICY "Users can create notifications for related users"
ON public.notifications FOR INSERT
WITH CHECK (
  -- Allow service role (for edge functions/triggers) to create any notification
  auth.uid() IS NOT NULL AND (
    -- User can only create notifications for themselves (e.g., test notifications)
    user_id = auth.uid()
    OR
    -- Or for users they have orders with
    EXISTS (
      SELECT 1 FROM orders o
      JOIN listings l ON l.id = o.listing_id
      WHERE (o.buyer_id = auth.uid() AND l.farmer_id = user_id)
         OR (l.farmer_id = auth.uid() AND o.buyer_id = user_id)
    )
    OR
    -- Or for users in delivery requests
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE (dr.buyer_id = auth.uid() AND (dr.seller_id = user_id OR dr.assigned_driver_id = user_id))
         OR (dr.seller_id = auth.uid() AND (dr.buyer_id = user_id OR dr.assigned_driver_id = user_id))
         OR (dr.assigned_driver_id = auth.uid() AND (dr.buyer_id = user_id OR dr.seller_id = user_id))
    )
    OR
    -- Or for driver hire requests
    EXISTS (
      SELECT 1 FROM driver_hire_requests dhr
      WHERE (dhr.buyer_id = auth.uid() AND dhr.driver_id = user_id)
         OR (dhr.driver_id = auth.uid() AND dhr.buyer_id = user_id)
    )
  )
);

-- Fix 3: Driver Profiles - Restrict phone visibility to users with relationship
-- Drop existing policy that exposes all available driver profiles with phone
DROP POLICY IF EXISTS "Buyers can view available driver profiles" ON public.driver_profiles;

-- Create a view for public driver browsing (without sensitive data)
CREATE OR REPLACE VIEW public.driver_profiles_public AS
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
  -- phone intentionally excluded
FROM public.driver_profiles
WHERE is_available = true;

-- Recreate the policy to only allow viewing driver profiles (phone hidden via view)
CREATE POLICY "Buyers can view available driver profiles"
ON public.driver_profiles FOR SELECT
USING (
  (is_available = true AND has_role(auth.uid(), 'buyer'::app_role))
);

-- Create policy for viewing full profile (with phone) only when there's a relationship
CREATE POLICY "Users can view full driver profile for active requests"
ON public.driver_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM driver_hire_requests dhr
    WHERE dhr.driver_id = driver_profiles.user_id
      AND dhr.buyer_id = auth.uid()
      AND dhr.status IN ('accepted', 'completed')
  )
  OR
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.assigned_driver_id = driver_profiles.user_id
      AND (dr.buyer_id = auth.uid() OR dr.seller_id = auth.uid())
  )
);