
-- Create trigger to update driver stats when delivery is completed
CREATE OR REPLACE FUNCTION public.update_driver_stats_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only run when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_driver_id IS NOT NULL THEN
    UPDATE public.driver_profiles
    SET 
      total_deliveries = total_deliveries + 1,
      total_earnings_usd = total_earnings_usd + COALESCE(NEW.agreed_price, 0),
      updated_at = now()
    WHERE user_id = NEW.assigned_driver_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_delivery_completed
  AFTER UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_driver_stats_on_completion();
