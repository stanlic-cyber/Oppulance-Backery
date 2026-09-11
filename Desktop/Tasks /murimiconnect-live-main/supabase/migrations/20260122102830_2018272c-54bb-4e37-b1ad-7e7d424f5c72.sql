-- Create driver hire requests table for direct driver hiring (separate from order-based delivery requests)
CREATE TABLE public.driver_hire_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  delivery_time TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_hire_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Buyers can create hire requests"
ON public.driver_hire_requests
FOR INSERT
WITH CHECK (auth.uid() = buyer_id AND has_role(auth.uid(), 'buyer'));

CREATE POLICY "Buyers can view their own hire requests"
ON public.driver_hire_requests
FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Drivers can view requests sent to them"
ON public.driver_hire_requests
FOR SELECT
USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can update requests sent to them"
ON public.driver_hire_requests
FOR UPDATE
USING (auth.uid() = driver_id);

CREATE POLICY "Buyers can update their own requests"
ON public.driver_hire_requests
FOR UPDATE
USING (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all hire requests"
ON public.driver_hire_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_driver_hire_requests_updated_at
BEFORE UPDATE ON public.driver_hire_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_driver_hire_requests_buyer ON public.driver_hire_requests(buyer_id);
CREATE INDEX idx_driver_hire_requests_driver ON public.driver_hire_requests(driver_id);
CREATE INDEX idx_driver_hire_requests_status ON public.driver_hire_requests(status);

-- Allow buyers to view available driver profiles (add new RLS policy)
CREATE POLICY "Buyers can view available driver profiles"
ON public.driver_profiles
FOR SELECT
USING (is_available = true AND has_role(auth.uid(), 'buyer'));