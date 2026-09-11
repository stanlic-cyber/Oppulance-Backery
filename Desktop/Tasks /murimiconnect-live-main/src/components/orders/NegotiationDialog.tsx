import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, DollarSign, ChevronUp, MessageCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MESSAGES_PER_PAGE = 50;

interface Message {
  id: string;
  sender_id: string;
  type: 'offer' | 'counter_offer' | 'accept' | 'reject' | 'message';
  text: string | null;
  meta: any;
  created_at: string;
}

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    quantity: number;
    offered_price: number;
    status: string;
    buyer_id?: string;
    listings: {
      title: string;
      unit: string;
      farmer_id: string;
    };
  };
  onStatusChange: (status: string) => void;
  onMessagesRead?: () => void;
}

export const NegotiationDialog = ({ open, onOpenChange, order, onStatusChange, onMessagesRead }: NegotiationDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const isFarmer = user?.id === order.listings.farmer_id;

  // Mark messages as read when dialog opens
  const markMessagesAsRead = useCallback(async () => {
    if (!user || !order.id) return;
    try {
      await supabase.rpc('mark_messages_read', {
        p_order_id: order.id,
        p_user_id: user.id
      });
      onMessagesRead?.();
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [order.id, user, onMessagesRead]);

  // Send email notification
  const sendEmailNotification = async (
    type: 'new_message' | 'offer' | 'counter_offer' | 'accept' | 'reject',
    messageText?: string,
    offeredPrice?: number
  ) => {
    if (!user) return;
    
    const recipientId = isFarmer ? order.buyer_id : order.listings.farmer_id;
    if (!recipientId) return;

    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type,
          order_id: order.id,
          sender_id: user.id,
          recipient_id: recipientId,
          listing_title: order.listings.title,
          message_text: messageText,
          offered_price: offeredPrice,
        },
      });
    } catch (err) {
      console.error('Error sending email notification:', err);
      // Don't show error to user - email is secondary
    }
  };

  // Fetch initial messages on open
  useEffect(() => {
    if (open && order.id) {
      setMessages([]);
      setHasMoreMessages(false);
      setOldestMessageDate(null);
      fetchMessages();
      // Mark messages as read when opening dialog
      markMessagesAsRead();
    }
  }, [open, order.id]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!open || !order.id) return;

    const channel = supabase
      .channel(`messages:${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${order.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error');
          // Fallback: refetch messages if realtime fails
          fetchMessages();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, order.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('order_id', order.id)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;

      const sortedData = (data as Message[] || []).reverse();
      setMessages(sortedData);
      
      if (sortedData.length > 0) {
        setOldestMessageDate(sortedData[0].created_at);
      }
      
      // Check if there are more messages
      setHasMoreMessages((count || 0) > MESSAGES_PER_PAGE);
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = useCallback(async () => {
    if (!oldestMessageDate || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', order.id)
        .lt('created_at', oldestMessageDate)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;

      const olderMessages = (data as Message[] || []).reverse();
      
      if (olderMessages.length > 0) {
        setMessages((prev) => [...olderMessages, ...prev]);
        setOldestMessageDate(olderMessages[0].created_at);
      }
      
      setHasMoreMessages(olderMessages.length === MESSAGES_PER_PAGE);
    } catch (err) {
      console.error('Error loading older messages:', err);
      toast.error('Failed to load older messages');
    } finally {
      setLoadingMore(false);
    }
  }, [oldestMessageDate, loadingMore, order.id]);

  const sendMessage = async (type: 'offer' | 'counter_offer' | 'accept' | 'reject' | 'message' = 'message', meta: any = {}) => {
    if (!user || (!newMessage.trim() && type === 'message')) return;

    setSending(true);
    try {
      const messageText = newMessage.trim() || null;
      const { error } = await supabase.from('messages').insert([{
        order_id: order.id,
        sender_id: user.id,
        type,
        text: messageText,
        meta,
      }]);

      if (error) throw error;
      setNewMessage('');
      toast.success('Message sent!');
      
      // Send email notification in background
      sendEmailNotification('new_message', messageText || undefined);
    } catch (err) {
      toast.error('Failed to send message. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCounterOffer = async () => {
    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSending(true);
    try {
      const messageText = `Counter offer: $${price.toFixed(2)} per ${order.listings.unit}`;
      await supabase.from('messages').insert([{
        order_id: order.id,
        sender_id: user?.id,
        type: 'counter_offer',
        text: messageText,
        meta: { offered_price: price, quantity: order.quantity },
      }]);

      await supabase.from('orders').update({ status: 'negotiating', offered_price: price }).eq('id', order.id);
      onStatusChange('negotiating');
      setCounterPrice('');
      setShowCounterInput(false);
      toast.success('Counter offer sent!');
      
      // Send email notification
      sendEmailNotification('counter_offer', messageText, price);
    } catch (err) {
      toast.error('Failed to send counter offer. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async () => {
    setSending(true);
    try {
      const messageText = 'Offer accepted! Let\'s finalize the deal.';
      await supabase.from('messages').insert([{
        order_id: order.id,
        sender_id: user?.id,
        type: 'accept',
        text: messageText,
        meta: { message: 'Offer accepted!' },
      }]);

      await supabase.from('orders').update({ status: 'accepted' }).eq('id', order.id);
      onStatusChange('accepted');
      toast.success('Offer accepted!');
      
      // Send email notification
      sendEmailNotification('accept', messageText);
    } catch (err) {
      toast.error('Failed to accept offer. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleReject = async () => {
    setSending(true);
    try {
      const messageText = 'Unfortunately, I cannot accept this offer.';
      await supabase.from('messages').insert([{
        order_id: order.id,
        sender_id: user?.id,
        type: 'reject',
        text: messageText,
        meta: {},
      }]);

      await supabase.from('orders').update({ status: 'rejected' }).eq('id', order.id);
      onStatusChange('rejected');
      toast.info('Offer rejected');
      onOpenChange(false);
      
      // Send email notification
      sendEmailNotification('reject', messageText);
    } catch (err) {
      toast.error('Failed to reject offer. Try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const canNegotiate = ['pending', 'negotiating'].includes(order.status);
  const isCompleted = ['completed', 'cancelled', 'rejected'].includes(order.status);
  const isConfirmed = ['confirmed', 'ready_for_delivery', 'accepted'].includes(order.status);

  // Get status-specific messaging
  const getStatusMessage = () => {
    switch (order.status) {
      case 'confirmed':
        return { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Deal confirmed! Communicate freely with your partner.', color: 'text-green-600 dark:text-green-400' };
      case 'accepted':
        return { icon: <Sparkles className="h-4 w-4" />, text: 'Offer accepted! Confirm the deal to proceed.', color: 'text-blue-600 dark:text-blue-400' };
      case 'ready_for_delivery':
        return { icon: <MessageCircle className="h-4 w-4" />, text: 'Ready for pickup! Coordinate delivery details.', color: 'text-primary' };
      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Premium Header */}
        <DialogHeader className="px-4 py-4 border-b border-border bg-gradient-to-r from-card to-muted/30">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="block font-semibold truncate max-w-[200px]">{order.listings.title}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {isFarmer ? 'Buyer conversation' : 'Seller conversation'}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              ${order.offered_price.toFixed(2)}/{order.listings.unit}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Status Banner */}
        {statusMessage && (
          <div className={cn(
            "px-4 py-2.5 bg-muted/50 border-b border-border flex items-center gap-2 text-sm",
            statusMessage.color
          )}>
            {statusMessage.icon}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-muted/10 to-muted/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                <MessageCircle className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Start the Conversation</h3>
              <p className="text-muted-foreground text-sm max-w-[280px]">
                {canNegotiate 
                  ? 'Send a message or make an offer to begin negotiating.'
                  : 'Send a message to communicate with your trading partner.'}
              </p>
            </div>
          ) : (
            <>
              {/* Load older messages button */}
              {hasMoreMessages && (
                <div className="flex justify-center mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadOlderMessages}
                    disabled={loadingMore}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <ChevronUp className="h-3 w-3 mr-1" />
                    )}
                    Load older messages
                  </Button>
                </div>
              )}
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center justify-center mb-3">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {msgs.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      const isSystemMessage = ['accept', 'reject'].includes(msg.type);

                      if (isSystemMessage) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <div className={`px-4 py-2 rounded-full text-xs font-medium ${
                              msg.type === 'accept' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {msg.type === 'accept' ? '✓ Deal Accepted' : '✕ Offer Rejected'}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={cn("flex", isOwn ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm",
                              isOwn
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-card border border-border rounded-bl-md'
                            )}
                          >
                            {msg.type === 'offer' && (
                              <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 mb-1">
                                <DollarSign className="h-3 w-3" />
                                Initial Offer
                              </div>
                            )}
                            {msg.type === 'counter_offer' && (
                              <div className={cn(
                                "flex items-center gap-1.5 text-xs font-semibold mb-1",
                                isOwn ? "text-primary-foreground/90" : "text-primary"
                              )}>
                                <DollarSign className="h-3 w-3" />
                                Counter: ${msg.meta?.offered_price?.toFixed(2)}/{order.listings.unit}
                              </div>
                            )}
                            {msg.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                            <p className={cn(
                              "text-[10px] mt-1.5",
                              isOwn ? 'opacity-70' : 'text-muted-foreground'
                            )}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions - Negotiation Phase */}
        {canNegotiate && (
          <div className="px-4 py-3 border-t border-border bg-gradient-to-r from-muted/50 to-card">
            {showCounterInput ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter price per unit"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button size="sm" onClick={handleCounterOffer} disabled={sending} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Offer'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCounterInput(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {isFarmer && order.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={handleAccept} disabled={sending} className="bg-green-600 hover:bg-green-700">
                      {t('negotiate.accept')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCounterInput(true)}>
                      {t('negotiate.counterOffer')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReject} disabled={sending} className="text-destructive hover:text-destructive">
                      {t('negotiate.reject')}
                    </Button>
                  </>
                )}
                {!isFarmer && order.status === 'negotiating' && (
                  <>
                    <Button size="sm" onClick={handleAccept} disabled={sending} className="bg-green-600 hover:bg-green-700">
                      Accept Counter
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCounterInput(true)}>
                      Counter Again
                    </Button>
                  </>
                )}
                {isFarmer && order.status === 'negotiating' && (
                  <>
                    <Button size="sm" onClick={handleAccept} disabled={sending} className="bg-green-600 hover:bg-green-700">
                      Accept Buyer's Counter
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCounterInput(true)}>
                      Counter Again
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Completed/Rejected notice */}
        {isCompleted && (
          <div className={cn(
            "px-4 py-3 border-t border-border",
            order.status === 'completed' ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/30"
          )}>
            <p className={cn(
              "text-sm text-center font-medium",
              order.status === 'completed' ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
            )}>
              {order.status === 'completed' && '✓ This order has been completed successfully'}
              {order.status === 'cancelled' && 'This order was cancelled'}
              {order.status === 'rejected' && 'This offer was rejected'}
            </p>
          </div>
        )}

        {/* Message Input - Premium styling */}
        {!isCompleted && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2 p-4 border-t border-border bg-card"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isConfirmed ? "Type a message to your trading partner..." : "Type a message..."}
              disabled={sending}
              className="flex-1 bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={sending || !newMessage.trim()}
              className="shrink-0 bg-primary hover:bg-primary/90 shadow-sm"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};