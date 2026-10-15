-- Enforce that AI messages and pending actions can only reference
-- conversations owned by the authenticated user.

DROP POLICY IF EXISTS "Users insert own ai messages" ON public.ai_messages;
CREATE POLICY "Users insert own ai messages"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users create own pending actions" ON public.ai_pending_actions;
CREATE POLICY "Users create own pending actions"
  ON public.ai_pending_actions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      conversation_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.ai_conversations c
        WHERE c.id = ai_pending_actions.conversation_id
          AND c.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users update own pending actions" ON public.ai_pending_actions;
CREATE POLICY "Users update own pending actions"
  ON public.ai_pending_actions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      conversation_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.ai_conversations c
        WHERE c.id = ai_pending_actions.conversation_id
          AND c.user_id = auth.uid()
      )
    )
  );
