-- Allow admins to delete wallet transactions (for rejecting pending top-ups)
CREATE POLICY "Admins can delete transactions"
ON public.wallet_transactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));