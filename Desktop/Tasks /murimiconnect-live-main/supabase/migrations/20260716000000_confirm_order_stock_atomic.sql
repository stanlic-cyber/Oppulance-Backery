-- Atomically confirm an accepted order and reserve listing stock.
-- This prevents overselling when multiple accepted orders are confirmed close together.
CREATE OR REPLACE FUNCTION public.confirm_order_and_deduct_stock(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_new_quantity NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT
    o.id,
    o.buyer_id,
    o.status,
    o.quantity AS order_quantity,
    o.listing_id,
    l.farmer_id,
    l.quantity AS available_quantity
  INTO v_order
  FROM public.orders o
  JOIN public.listings l ON l.id = o.listing_id
  WHERE o.id = p_order_id
  FOR UPDATE OF o, l;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() <> v_order.buyer_id AND auth.uid() <> v_order.farmer_id THEN
    RAISE EXCEPTION 'Only order participants can confirm this order';
  END IF;

  IF v_order.status <> 'accepted'::public.order_status THEN
    RAISE EXCEPTION 'Only accepted orders can be confirmed';
  END IF;

  IF v_order.available_quantity < v_order.order_quantity THEN
    RAISE EXCEPTION 'Insufficient stock available';
  END IF;

  v_new_quantity := v_order.available_quantity - v_order.order_quantity;

  UPDATE public.orders
  SET
    status = 'confirmed'::public.order_status,
    confirmed_at = now(),
    updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.listings
  SET
    quantity = v_new_quantity,
    status = CASE
      WHEN v_new_quantity <= 0 THEN 'sold'::public.listing_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_order.listing_id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_order_and_deduct_stock(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_and_deduct_stock(UUID) TO authenticated;
