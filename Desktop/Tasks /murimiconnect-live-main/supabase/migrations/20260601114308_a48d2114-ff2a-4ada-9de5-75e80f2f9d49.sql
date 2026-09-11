-- 1) Prevent privilege escalation: cannot self-assign admin role on signup
DROP POLICY IF EXISTS "Users can insert own role during signup" ON public.user_roles;

CREATE POLICY "Users can insert own non-admin role during signup"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role <> 'admin'::app_role
  );

-- 2) Restrict listing-images uploads to farmers, scoped to their own folder
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;

-- (Existing "Farmers can manage their listing images" policy remains and handles the correct path.)
-- If that policy does not exist, create a strict one:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Farmers can upload their own listing images'
  ) THEN
    CREATE POLICY "Farmers can upload their own listing images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'listing-images'
        AND public.has_role(auth.uid(), 'farmer'::app_role)
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;