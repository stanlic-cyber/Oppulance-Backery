-- Create a function to handle user data deletion with proper cascading
CREATE OR REPLACE FUNCTION public.delete_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete in correct order to respect foreign key constraints
  -- First delete child records that reference other tables
  DELETE FROM public.delivery_bids WHERE driver_id = OLD.id;
  DELETE FROM public.delivery_ratings WHERE rater_id = OLD.id OR driver_id = OLD.id;
  DELETE FROM public.driver_request_messages WHERE sender_id = OLD.id;
  DELETE FROM public.wallet_transactions WHERE driver_id = OLD.id OR admin_id = OLD.id;
  
  -- Delete delivery requests where user is participant
  DELETE FROM public.delivery_requests WHERE buyer_id = OLD.id OR seller_id = OLD.id OR assigned_driver_id = OLD.id;
  
  -- Delete driver hire requests
  DELETE FROM public.driver_hire_requests WHERE buyer_id = OLD.id OR driver_id = OLD.id;
  
  -- Delete messages
  DELETE FROM public.messages WHERE sender_id = OLD.id;
  
  -- Delete orders (after delivery_requests since delivery_requests references orders)
  DELETE FROM public.orders WHERE buyer_id = OLD.id;
  
  -- Delete reported listings
  DELETE FROM public.reported_listings WHERE reporter_id = OLD.id OR reviewed_by = OLD.id;
  
  -- Delete listings (after orders and reported_listings)
  DELETE FROM public.listings WHERE farmer_id = OLD.id;
  
  -- Delete support tickets
  DELETE FROM public.support_tickets WHERE user_id = OLD.id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = OLD.id;
  
  -- Delete driver-related data
  DELETE FROM public.driver_locations WHERE driver_id = OLD.id;
  DELETE FROM public.driver_wallets WHERE driver_id = OLD.id;
  DELETE FROM public.driver_profiles WHERE user_id = OLD.id;
  
  -- Delete admin audit logs
  DELETE FROM public.admin_audit_logs WHERE admin_id = OLD.id;
  
  -- Delete user role
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users to cascade deletions
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.delete_user_data();