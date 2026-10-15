-- Add negotiation fields to driver_hire_requests table
ALTER TABLE public.driver_hire_requests 
ADD COLUMN IF NOT EXISTS buyer_offer_amount NUMERIC,
ADD COLUMN IF NOT EXISTS driver_counter_amount NUMERIC,
ADD COLUMN IF NOT EXISTS final_agreed_amount NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS negotiation_status TEXT DEFAULT 'open' CHECK (negotiation_status IN ('open', 'countered', 'agreed', 'cancelled'));

-- Update status check constraint to include new statuses
ALTER TABLE public.driver_hire_requests DROP CONSTRAINT IF EXISTS driver_hire_requests_status_check;
ALTER TABLE public.driver_hire_requests ADD CONSTRAINT driver_hire_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled'));

-- Create index for negotiation status
CREATE INDEX IF NOT EXISTS idx_driver_hire_requests_negotiation ON public.driver_hire_requests(negotiation_status);