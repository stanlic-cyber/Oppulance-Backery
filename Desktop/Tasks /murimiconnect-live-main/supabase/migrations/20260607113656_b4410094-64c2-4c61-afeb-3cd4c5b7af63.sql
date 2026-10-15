
-- A) Fully internal funcs
REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, public.wallet_ledger_type, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_debit(uuid, numeric, public.wallet_ledger_type, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_wallet(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_platform_fee(uuid, text, numeric, numeric, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_platform_fee(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_driver_wallet(uuid, numeric, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.escalate_overdue_disputes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_lock_overdue_fees() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_release_escrow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_orders() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, public.wallet_ledger_type, text, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_debit(uuid, numeric, public.wallet_ledger_type, text, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_wallet(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_platform_fee(uuid, text, numeric, numeric, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_platform_fee(uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_driver_wallet(uuid, numeric, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.escalate_overdue_disputes() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_lock_overdue_fees() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_release_escrow() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders() TO service_role;

-- B) User-facing RPCs — revoke from anon only
REVOKE EXECUTE ON FUNCTION public.raise_dispute(uuid, text, text, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.escrow_lock(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.escrow_release(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.escrow_refund(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, public.withdrawal_method, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_withdrawal(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_topup(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_topup(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_withdrawal_paid(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_fee_payment_proof(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_fee_otp(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_message_count(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_payment_details_for_locked_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_verification_status(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_health() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_user_locked(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;

-- C) Storage — no bulk listing of listing-images
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;

-- D) Safe public profile projection
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT id, name, avatar_url, province, nearest_town, farm_name, preferred_language, created_at
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
COMMENT ON VIEW public.profiles_public IS 'Safe public projection (no phone, no email).';
