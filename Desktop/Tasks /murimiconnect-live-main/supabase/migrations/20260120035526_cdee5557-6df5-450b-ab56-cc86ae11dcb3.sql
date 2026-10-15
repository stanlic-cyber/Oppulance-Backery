-- Allow order participants to update messages (for marking as read)
CREATE POLICY "Order participants can update messages"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN listings l ON l.id = o.listing_id
    WHERE o.id = messages.order_id
      AND (o.buyer_id = auth.uid() OR l.farmer_id = auth.uid())
  )
);