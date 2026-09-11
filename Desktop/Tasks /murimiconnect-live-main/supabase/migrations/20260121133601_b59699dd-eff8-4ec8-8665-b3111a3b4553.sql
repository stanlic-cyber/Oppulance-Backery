-- Add platform fee columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS subtotal numeric,
ADD COLUMN IF NOT EXISTS platform_fee_percent numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount numeric;

-- Update existing orders to calculate these values (retroactively with 0% fee)
UPDATE public.orders
SET 
  subtotal = quantity * offered_price,
  platform_fee_percent = 0,
  platform_fee_amount = 0,
  total_amount = quantity * offered_price
WHERE subtotal IS NULL;