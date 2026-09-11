
-- AI chat history per user with conversation memory
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id, updated_at DESC);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);
CREATE INDEX idx_ai_messages_user ON public.ai_messages(user_id, created_at DESC);

-- Learned facts/preferences extracted from conversations (long-term memory)
CREATE TABLE public.ai_user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  category TEXT,
  importance INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_user_memory_user ON public.ai_user_memory(user_id, importance DESC, last_used_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_memory ENABLE ROW LEVEL SECURITY;

-- Users own their conversations
CREATE POLICY "Users view own conversations" ON public.ai_conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations" ON public.ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own conversations" ON public.ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own ai messages" ON public.ai_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai messages" ON public.ai_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ai messages" ON public.ai_messages
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own ai memory" ON public.ai_user_memory
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users delete own ai memory" ON public.ai_user_memory
  FOR DELETE USING (auth.uid() = user_id);
-- Inserts/updates happen via service role inside edge function only
