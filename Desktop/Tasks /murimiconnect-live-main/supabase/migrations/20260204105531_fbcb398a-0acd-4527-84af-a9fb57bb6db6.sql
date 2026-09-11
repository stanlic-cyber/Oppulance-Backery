-- Enable RLS on lovable_proof table to fix security warning
ALTER TABLE public.lovable_proof ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read lovable_proof
CREATE POLICY "Authenticated users can read lovable_proof"
ON public.lovable_proof
FOR SELECT
TO authenticated
USING (true);