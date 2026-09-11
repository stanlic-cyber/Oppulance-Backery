-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for orders table (for status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;