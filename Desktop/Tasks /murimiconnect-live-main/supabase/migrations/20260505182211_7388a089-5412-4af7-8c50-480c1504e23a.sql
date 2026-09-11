
-- 1. DRIVER DOCUMENTS
CREATE TABLE public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('license','national_id','vehicle_registration','insurance')),
  file_url TEXT NOT NULL,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_driver_documents_driver ON public.driver_documents(driver_id);
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own documents" ON public.driver_documents
  FOR ALL USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Admins view all documents" ON public.driver_documents
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update documents" ON public.driver_documents
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_driver_documents_updated_at
  BEFORE UPDATE ON public.driver_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for driver documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Drivers upload own docs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Drivers read own docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Drivers update own docs" ON storage.objects FOR UPDATE
  USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Drivers delete own docs" ON storage.objects FOR DELETE
  USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all driver docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- 2. DISPUTE SLA
ALTER TABLE public.escrow_disputes
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.escalate_overdue_disputes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  v_count INT := 0;
  v_admin RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR d IN
    SELECT id, escrow_hold_id
    FROM public.escrow_disputes
    WHERE status = 'open'
      AND created_at < now() - INTERVAL '48 hours'
      AND escalation_level = 0
    LIMIT 100
  LOOP
    UPDATE public.escrow_disputes
      SET escalation_level = 1, escalated_at = now()
      WHERE id = d.id;

    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        v_admin.user_id,
        'dispute_escalation',
        '⚠️ Dispute overdue (>48h)',
        'A dispute has been open for more than 48 hours and needs review.',
        '/admin/escrow'
      );
    END LOOP;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3. LISTING MODERATION
CREATE TABLE public.listing_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','flagged','rejected')),
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_moderation_listing ON public.listing_moderation(listing_id);
ALTER TABLE public.listing_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own moderation" ON public.listing_moderation
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_moderation.listing_id AND l.farmer_id = auth.uid()
  ));
CREATE POLICY "Admins view all moderation" ON public.listing_moderation
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update moderation" ON public.listing_moderation
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_listing_moderation_updated_at
  BEFORE UPDATE ON public.listing_moderation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RECENTLY VIEWED
CREATE TABLE public.recently_viewed_listings (
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
CREATE INDEX idx_recently_viewed_user_time ON public.recently_viewed_listings(user_id, viewed_at DESC);
ALTER TABLE public.recently_viewed_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recently viewed" ON public.recently_viewed_listings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
