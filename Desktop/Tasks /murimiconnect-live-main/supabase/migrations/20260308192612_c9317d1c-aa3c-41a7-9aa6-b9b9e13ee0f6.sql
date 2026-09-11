-- Fix profiles_public view: grant SELECT to anon and authenticated
GRANT SELECT ON public.profiles_public TO anon;
GRANT SELECT ON public.profiles_public TO authenticated;

-- Also ensure driver_profiles_public and platform_fee_rates are accessible
GRANT SELECT ON public.driver_profiles_public TO anon;
GRANT SELECT ON public.driver_profiles_public TO authenticated;
GRANT SELECT ON public.platform_fee_rates TO anon;
GRANT SELECT ON public.platform_fee_rates TO authenticated;