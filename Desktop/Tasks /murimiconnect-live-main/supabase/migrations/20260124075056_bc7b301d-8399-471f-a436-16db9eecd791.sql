-- Fix: Make listing-images bucket public for marketplace browsing
-- This allows unauthenticated users to view product images, which is standard for e-commerce

-- Make listing-images bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'listing-images';

-- Drop the authenticated-only policy for listing images
DROP POLICY IF EXISTS "Authenticated users can view listing images" ON storage.objects;

-- Create policy allowing anyone (including anonymous users) to view listing images
CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'listing-images');

-- Keep profile-images private - only authenticated users can view
-- (This policy may already exist, so we use IF NOT EXISTS pattern)
DROP POLICY IF EXISTS "Authenticated users can view profile images" ON storage.objects;
CREATE POLICY "Authenticated users can view profile images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-images');