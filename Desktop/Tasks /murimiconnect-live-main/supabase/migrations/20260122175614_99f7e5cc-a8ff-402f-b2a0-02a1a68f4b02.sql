-- =====================================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- =====================================================

-- 1. DROP AND RECREATE NOTIFICATION POLICIES (stop fake notifications)
-- Only allow users to create notifications for THEMSELVES or via service role
DROP POLICY IF EXISTS "Users can create notifications for related users" ON public.notifications;

-- New strict policy: users can only insert notifications for themselves
CREATE POLICY "Users can only create self-notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. DROP existing overly permissive profile policies and recreate strict ones
DROP POLICY IF EXISTS "Users can view profiles from orders" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles from driver hire requests" ON public.profiles;
DROP POLICY IF EXISTS "Users can view assigned driver profiles" ON public.profiles;

-- Strict profile viewing: only own profile, active order counterparties, or admin
CREATE POLICY "Users can view counterparty profiles via orders"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN listings l ON l.id = o.listing_id
    WHERE (
      (o.buyer_id = auth.uid() AND l.farmer_id = profiles.id)
      OR (l.farmer_id = auth.uid() AND o.buyer_id = profiles.id)
    )
  )
);

CREATE POLICY "Users can view profiles via accepted driver hire requests"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM driver_hire_requests dhr
    WHERE dhr.status IN ('accepted', 'completed')
    AND (
      (dhr.buyer_id = auth.uid() AND dhr.driver_id = profiles.id)
      OR (dhr.driver_id = auth.uid() AND dhr.buyer_id = profiles.id)
    )
  )
);

CREATE POLICY "Users can view profiles via assigned deliveries"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.assigned_driver_id = profiles.id
    AND (dr.buyer_id = auth.uid() OR dr.seller_id = auth.uid())
  )
);

-- 3. DROP and recreate driver_profiles policies to restrict phone access
DROP POLICY IF EXISTS "Buyers can view available driver profiles" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can view full driver profile for active requests" ON public.driver_profiles;
DROP POLICY IF EXISTS "Anyone can view driver profiles for assigned deliveries" ON public.driver_profiles;

-- Buyers can only see public driver data via the public view (no phone)
-- Full driver profile (with phone) only visible after accepted request
CREATE POLICY "Users can view driver profile after accepted hire request"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM driver_hire_requests dhr
    WHERE dhr.driver_id = driver_profiles.user_id
    AND dhr.buyer_id = auth.uid()
    AND dhr.status IN ('accepted', 'completed')
  )
);

CREATE POLICY "Users can view driver profile for assigned deliveries"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.assigned_driver_id = driver_profiles.user_id
    AND (dr.buyer_id = auth.uid() OR dr.seller_id = auth.uid())
  )
);

-- 4. Update the public driver view to ensure it uses SECURITY INVOKER
DROP VIEW IF EXISTS public.driver_profiles_public;

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
  -- NOTE: phone is explicitly excluded for privacy
FROM public.driver_profiles;

-- Grant access to the public view for anyone
GRANT SELECT ON public.driver_profiles_public TO anon, authenticated;

-- 5. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('listing-images', 'profile-images');

-- 6. Create storage RLS policies for private bucket access
-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view images" ON storage.objects;

-- Allow authenticated users to view listing images (public listing feature)
CREATE POLICY "Authenticated users can view listing images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'listing-images');

-- Allow authenticated users to view profile images
CREATE POLICY "Authenticated users can view profile images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-images');

-- Farmers can upload/update/delete their own listing images
CREATE POLICY "Farmers can manage their listing images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'listing-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND has_role(auth.uid(), 'farmer')
)
WITH CHECK (
  bucket_id = 'listing-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND has_role(auth.uid(), 'farmer')
);

-- Users can manage their own profile images
CREATE POLICY "Users can manage their profile images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all storage objects
CREATE POLICY "Admins can view all storage objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 7. Ensure all sensitive tables have RLS enabled (verification)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_hire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;