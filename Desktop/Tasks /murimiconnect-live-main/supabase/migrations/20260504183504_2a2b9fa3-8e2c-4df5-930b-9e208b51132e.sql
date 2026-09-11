
-- Pending AI actions: AI proposes, user confirms, server executes
CREATE TABLE public.ai_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

ALTER TABLE public.ai_pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pending actions"
  ON public.ai_pending_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own pending actions"
  ON public.ai_pending_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending actions"
  ON public.ai_pending_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_pending_actions_user ON public.ai_pending_actions(user_id, status, created_at DESC);

-- Memory cap: keep only top 50 facts per user by importance + recency
CREATE OR REPLACE FUNCTION public.cap_ai_user_memory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_user_memory
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM public.ai_user_memory
      WHERE user_id = NEW.user_id
      ORDER BY importance DESC, last_used_at DESC
      LIMIT 50
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cap_ai_user_memory
AFTER INSERT ON public.ai_user_memory
FOR EACH ROW EXECUTE FUNCTION public.cap_ai_user_memory();

-- Allow service role inserts on ai_user_memory (was missing INSERT policy for users; service role bypasses RLS)
-- Add UPDATE policy so users can manage their memory
CREATE POLICY "Users update own ai memory"
  ON public.ai_user_memory FOR UPDATE
  USING (auth.uid() = user_id);
