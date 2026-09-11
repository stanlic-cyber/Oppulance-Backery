-- Add indexes for messaging performance and scalability
CREATE INDEX IF NOT EXISTS idx_messages_order_created ON public.messages(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON public.orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON public.listings(farmer_id);