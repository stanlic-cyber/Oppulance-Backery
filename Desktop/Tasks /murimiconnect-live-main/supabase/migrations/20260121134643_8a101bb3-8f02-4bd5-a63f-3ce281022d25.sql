-- 1. Add 'ready_for_delivery' to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready_for_delivery';

-- 2. Add timestamp columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 3. Add verified field to profiles (admin-only toggle)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- 4. Create reported_listings table for buyer reports
CREATE TABLE IF NOT EXISTS public.reported_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reported_listings
ALTER TABLE public.reported_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies for reported_listings
CREATE POLICY "Users can report listings" 
ON public.reported_listings 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" 
ON public.reported_listings 
FOR SELECT 
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" 
ON public.reported_listings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reports" 
ON public.reported_listings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reports" 
ON public.reported_listings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Add index for faster listing reports lookup
CREATE INDEX IF NOT EXISTS idx_reported_listings_listing_id ON public.reported_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_reported_listings_status ON public.reported_listings(status);

-- 6. Add index on orders for faster status queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);

-- 7. Add index on listings for better search/filter
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_province ON public.listings(province);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price_per_unit);

-- 8. Update admin permissions for profiles (to toggle verified status)
-- Admins can update profiles to set verified status
CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));