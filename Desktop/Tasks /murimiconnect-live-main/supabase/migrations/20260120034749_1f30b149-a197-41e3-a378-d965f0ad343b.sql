-- Add read_at column to messages for tracking unread status
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient unread message queries
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(order_id, read_at) WHERE read_at IS NULL;

-- Create a view or function to get unread counts per order for a user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_order_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.messages
  WHERE order_id = p_order_id
    AND sender_id != p_user_id
    AND read_at IS NULL
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_order_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.messages
  SET read_at = NOW()
  WHERE order_id = p_order_id
    AND sender_id != p_user_id
    AND read_at IS NULL
$$;