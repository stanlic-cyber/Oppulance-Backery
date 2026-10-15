-- Create driver_request_messages table for chat
CREATE TABLE public.driver_request_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_request_id UUID NOT NULL REFERENCES public.driver_hire_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('buyer', 'driver')),
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_request_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies: Only buyer and driver of the request can view/send messages
CREATE POLICY "Participants can view messages"
ON public.driver_request_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.driver_hire_requests dhr
    WHERE dhr.id = driver_request_messages.driver_request_id
    AND (dhr.buyer_id = auth.uid() OR dhr.driver_id = auth.uid())
  )
);

CREATE POLICY "Participants can send messages"
ON public.driver_request_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.driver_hire_requests dhr
    WHERE dhr.id = driver_request_messages.driver_request_id
    AND (dhr.buyer_id = auth.uid() OR dhr.driver_id = auth.uid())
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_request_messages;

-- Add indexes for performance
CREATE INDEX idx_driver_request_messages_request_id ON public.driver_request_messages(driver_request_id);
CREATE INDEX idx_driver_request_messages_created_at ON public.driver_request_messages(created_at);