
-- 1. Enum for KYC status
DO $$ BEGIN
  CREATE TYPE public.kyc_status AS ENUM ('not_submitted','pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_status public.kyc_status NOT NULL DEFAULT 'not_submitted';

-- 3. Extend driver_profiles
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS kyc_status public.kyc_status NOT NULL DEFAULT 'not_submitted';

-- 4. kyc_submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('seller','driver')),
  id_number TEXT,
  id_photo_url TEXT,
  selfie_url TEXT,
  licence_url TEXT,
  vehicle_reg_url TEXT,
  vehicle_plate TEXT,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own KYC"
  ON public.kyc_submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own KYC"
  ON public.kyc_submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update KYC"
  ON public.kyc_submissions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS kyc_submissions_user_id_idx ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS kyc_submissions_status_idx ON public.kyc_submissions(status);

CREATE TRIGGER kyc_submissions_updated_at
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS on kyc-documents storage bucket
-- Path convention: <user_id>/<filename>
CREATE POLICY "KYC owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "KYC owner upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "KYC owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. Helper: get verification snapshot for a user (used by gating UI)
CREATE OR REPLACE FUNCTION public.get_verification_status(p_user_id UUID)
RETURNS TABLE(phone_verified BOOLEAN, kyc_status public.kyc_status, driver_kyc_status public.kyc_status)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT
    (p.phone_verified_at IS NOT NULL) AS phone_verified,
    p.kyc_status,
    COALESCE(d.kyc_status, 'not_submitted'::public.kyc_status) AS driver_kyc_status
  FROM public.profiles p
  LEFT JOIN public.driver_profiles d ON d.user_id = p.id
  WHERE p.id = p_user_id;
$$;

-- 7. Auto-release escrow 72h after delivery if no dispute
CREATE OR REPLACE FUNCTION public.auto_release_escrow()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR r IN
    SELECT eh.id, eh.order_id, eh.seller_id, eh.amount_usd
    FROM public.escrow_holds eh
    JOIN public.orders o ON o.id = eh.order_id
    WHERE eh.status = 'held'
      AND o.status = 'delivered'
      AND o.updated_at < now() - INTERVAL '72 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.escrow_disputes d
        WHERE d.escrow_hold_id = eh.id AND d.status = 'open'
      )
    LIMIT 200
  LOOP
    BEGIN
      PERFORM public.wallet_credit(
        r.seller_id, r.amount_usd, 'escrow_release', 'escrow_hold', r.id,
        'Auto-released 72h after delivery (no dispute)', NULL
      );
      UPDATE public.escrow_holds
        SET status = 'released', released_at = now()
        WHERE id = r.id;
      v_count := v_count + 1;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;
