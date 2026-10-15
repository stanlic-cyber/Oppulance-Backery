import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Bot, User, Sparkles, Plus, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { ConfirmActionCard } from './ConfirmActionCard';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { haptic } from '@/lib/haptics';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CONFIRM_RE = /\[\[CONFIRM:([0-9a-f-]{36})\]\]/gi;
function extractConfirmIds(text: string): string[] {
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(CONFIRM_RE);
  while ((m = re.exec(text)) !== null) ids.push(m[1]);
  return ids;
}
function stripConfirmMarkers(text: string) {
  return text.replace(CONFIRM_RE, '').trim();
}

export const AIChatWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load most recent conversation history when chat is opened
  useEffect(() => {
    if (!open || !user || historyLoaded) {
      if (open) inputRef.current?.focus();
      return;
    }
    (async () => {
      const { data: convs } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (convs && convs.length > 0) {
        const cid = convs[0].id;
        setConversationId(cid);
        const { data: msgs } = await supabase
          .from('ai_messages')
          .select('role, content')
          .eq('conversation_id', cid)
          .order('created_at', { ascending: true })
          .limit(50);
        const loaded = (msgs || []).map((m: any) => ({ role: m.role, content: m.content }));
        if (loaded.length > 0) {
          setMessages(loaded);
        } else {
          setMessages([{
            role: 'assistant',
            content: "👋 Hi! I'm **Murimi AI**, built by the Murimi Connect team. Ask me about orders, deliveries, listings, or anything else!",
          }]);
        }
      } else {
        setMessages([{
          role: 'assistant',
          content: "👋 Hi! I'm **Murimi AI**, your in-house assistant from the Murimi Connect team. Ask me about orders, deliveries, listings, or drivers — I'll remember our chats to help you better next time.",
        }]);
      }
      setHistoryLoaded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    })();
  }, [open, user, historyLoaded]);

  const handleNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([{
      role: 'assistant',
      content: "👋 New conversation started. How can I help?",
    }]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    haptic('tap');

    try {
      const { data, error } = await supabase.functions.invoke('ai-support', {
        body: { message: trimmed, conversation_id: conversationId },
      });
      if (error) throw error;
      if (data?.conversation_id && data.conversation_id !== conversationId) {
        setConversationId(data.conversation_id);
      }
      const reply = data?.reply || "Sorry, I couldn't process that. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (voiceOn) voice.speak(stripConfirmMarkers(reply));
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again or visit **Help** for support.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, conversationId, voiceOn, voice]);

  const handleSend = useCallback(() => sendMessage(input), [sendMessage, input]);

  const handleMicToggle = useCallback(() => {
    if (voice.listening) { voice.stop(); return; }
    voice.start((finalText) => { sendMessage(finalText); });
  }, [voice, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;
  return (
    <>
      {/* FAB — positioned above bottom nav on mobile */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center bottom-[76px] right-4 md:bottom-6 md:right-6 md:h-14 md:w-14"
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed z-50 bg-card border border-border flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 shadow-2xl
          inset-x-0 bottom-[60px] top-12 rounded-none
          md:inset-auto md:bottom-6 md:right-6 md:w-[360px] md:h-[480px] md:rounded-2xl md:top-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-primary text-primary-foreground flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">Murimi AI</p>
                <p className="text-[10px] opacity-80">Built by Murimi Connect</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {voice.supported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { if (voiceOn) window.speechSynthesis?.cancel(); setVoiceOn(v => !v); }}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  title={voiceOn ? 'Mute voice replies' : 'Speak replies aloud'}
                >
                  {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                title="New chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 [&>ul]:mb-1 [&>ul]:pl-4">
                        <ReactMarkdown>{stripConfirmMarkers(msg.content)}</ReactMarkdown>
                        {extractConfirmIds(msg.content).map((cid) => (
                          <ConfirmActionCard key={cid} pendingId={cid} />
                        ))}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center mt-0.5">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-center">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input — single-line for mobile friendliness */}
          <div className="px-3 py-2.5 border-t border-border bg-card flex-shrink-0">
            {voice.listening && (
              <div className="text-[11px] text-primary mb-1.5 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Listening… {voice.interim && <em className="text-muted-foreground truncate">{voice.interim}</em>}
              </div>
            )}
            <div className="flex gap-2 items-center">
              {voice.supported && (
                <Button
                  size="icon"
                  variant={voice.listening ? 'default' : 'outline'}
                  className="h-10 w-10 rounded-xl flex-shrink-0"
                  onClick={handleMicToggle}
                  disabled={loading}
                  title={voice.listening ? 'Stop' : 'Speak'}
                >
                  {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voice.listening ? 'Listening…' : 'Ask me anything...'}
                className="flex-1 h-10 px-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={2000}
                disabled={loading}
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-xl flex-shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
