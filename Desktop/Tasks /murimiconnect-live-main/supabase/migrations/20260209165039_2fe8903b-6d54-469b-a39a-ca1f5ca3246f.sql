
-- Allow farmers (sellers) to also create hire requests for drivers
DROP POLICY IF EXISTS "Buyers can create hire requests" ON public.driver_hire_requests;
CREATE POLICY "Buyers and sellers can create hire requests"
ON public.driver_hire_requests
FOR INSERT
WITH CHECK (
  (auth.uid() = buyer_id) AND 
  (has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'farmer'::app_role))
);

-- Allow farmers to also view their hire requests
DROP POLICY IF EXISTS "Buyers can view their own hire requests" ON public.driver_hire_requests;
CREATE POLICY "Requesters can view their own hire requests"
ON public.driver_hire_requests
FOR SELECT
USING (auth.uid() = buyer_id);

-- Allow farmers to also update their hire requests
DROP POLICY IF EXISTS "Buyers can update their own requests" ON public.driver_hire_requests;
CREATE POLICY "Requesters can update their own requests"
ON public.driver_hire_requests
FOR UPDATE
USING (auth.uid() = buyer_id);
