-- Update messages RLS to include drivers for delivery-related orders
-- First, drop existing message policies and recreate with driver support

DROP POLICY IF EXISTS "Order participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Order participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Order participants can update messages" ON public.messages;

-- Recreate with driver support: buyer, seller, OR assigned driver can view/send messages
CREATE POLICY "Order participants can view messages" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN listings l ON l.id = o.listing_id
    LEFT JOIN delivery_requests dr ON dr.order_id = o.id
    WHERE o.id = messages.order_id
      AND (
        o.buyer_id = auth.uid() 
        OR l.farmer_id = auth.uid()
        OR dr.assigned_driver_id = auth.uid()
      )
  )
);

CREATE POLICY "Order participants can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN listings l ON l.id = o.listing_id
    LEFT JOIN delivery_requests dr ON dr.order_id = o.id
    WHERE o.id = messages.order_id
      AND (
        o.buyer_id = auth.uid() 
        OR l.farmer_id = auth.uid()
        OR dr.assigned_driver_id = auth.uid()
      )
  )
);

CREATE POLICY "Order participants can update messages" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN listings l ON l.id = o.listing_id
    LEFT JOIN delivery_requests dr ON dr.order_id = o.id
    WHERE o.id = messages.order_id
      AND (
        o.buyer_id = auth.uid() 
        OR l.farmer_id = auth.uid()
        OR dr.assigned_driver_id = auth.uid()
      )
  )
);

-- Add indexes for delivery performance
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status_province ON public.delivery_requests(status, pickup_province, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_bids_request_created ON public.delivery_bids(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_driver_created ON public.wallet_transactions(driver_id, created_at DESC);