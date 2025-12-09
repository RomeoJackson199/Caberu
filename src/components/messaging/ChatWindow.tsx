import { useState, useEffect, useRef } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Check, CheckCheck, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface Message {
  id: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  message_text: string;
  created_at: string;
  is_read: boolean;
}

interface ChatWindowProps {
  currentUserId: string;
  recipient: {
    id: string;
    name: string;
    businessId: string;
  };
  onBack: (() => void) | null;
}

export function ChatWindow({
  currentUserId,
  recipient,
  onBack
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isOnline] = useState(Math.random() > 0.5); // Mock online status

  useEffect(() => {
    loadCurrentProfile();
  }, [currentUserId]);

  useEffect(() => {
    if (currentProfileId) {
      loadMessages();
      setupRealtimeSubscription();
      markMessagesAsRead();
    }
  }, [currentProfileId, recipient.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCurrentProfile = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', currentUserId)
      .single();

    if (profile) {
      setCurrentProfileId(profile.id);
    }
  };

  const loadMessages = async () => {
    if (!currentProfileId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_profile_id.eq.${currentProfileId},recipient_profile_id.eq.${recipient.id}),and(sender_profile_id.eq.${recipient.id},recipient_profile_id.eq.${currentProfileId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chat-${currentProfileId}-${recipient.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_profile_id=eq.${currentProfileId}`
        },
        (payload) => {
          if (payload.new.sender_profile_id === recipient.id) {
            setMessages((prev) => [...prev, payload.new as Message]);
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async () => {
    if (!currentProfileId) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('recipient_profile_id', currentProfileId)
      .eq('sender_profile_id', recipient.id)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentProfileId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        business_id: recipient.businessId,
        sender_profile_id: currentProfileId,
        recipient_profile_id: recipient.id,
        message_text: newMessage.trim()
      });

      if (error) throw error;

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaInput = (event: FormEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [newMessage]);

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-gradient-to-br from-background/95 via-background/95 to-muted/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md">
        <div className="p-4 flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 hover:bg-primary/10 transition-all duration-300">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-800 shadow-md border-2 border-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold">
              {recipient.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate">{recipient.name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <span className={cn(
                "inline-block w-2 h-2 rounded-full shadow-sm",
                isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
              )} />
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="w-full space-y-6">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date} className="space-y-4">
              {/* Date divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <span className="text-xs text-muted-foreground font-bold px-4 py-1.5 rounded-full bg-gradient-to-br from-muted/80 to-muted shadow-sm border border-border/50 uppercase tracking-wider">
                  {formatMessageDate(msgs[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>

              <AnimatePresence initial={false}>
                {msgs.map((msg, index) => {
                  const isOwnMessage = msg.sender_profile_id === currentProfileId;
                  const showAvatar = index === 0 || msgs[index - 1].sender_profile_id !== msg.sender_profile_id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'flex gap-3 items-end',
                        isOwnMessage ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {!isOwnMessage && (
                        <div className="w-8 shrink-0">
                          {showAvatar && (
                            <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-gray-800 shadow-sm border border-primary/10">
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white text-xs font-bold">
                                {recipient.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'group relative max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md hover:shadow-lg transition-all duration-300',
                          isOwnMessage
                            ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground rounded-br-sm'
                            : 'bg-card border border-border/50 rounded-bl-sm backdrop-blur-sm'
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message_text}
                        </p>
                        <div className={cn(
                          "flex items-center gap-1.5 mt-1.5 text-xs",
                          isOwnMessage ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                        )}>
                          <span className="font-medium">{format(new Date(msg.created_at), 'HH:mm')}</span>
                          {isOwnMessage && (
                            msg.is_read ? (
                              <CheckCheck className="h-3.5 w-3.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )
                          )}
                        </div>
                      </motion.div>

                      {isOwnMessage && <div className="w-8" />}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-gradient-to-br from-background/95 via-background/95 to-muted/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shadow-lg">
        <div className="w-full">
          <div className="rounded-2xl border-2 border-border/50 bg-background shadow-md hover:shadow-xl focus-within:shadow-xl focus-within:border-primary/50 transition-all duration-300">
            <div className="flex items-end gap-3 p-3">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleTextareaInput}
                placeholder="Type your message..."
                disabled={sending}
                className="min-h-[44px] max-h-40 resize-none border-0 bg-transparent px-3 py-2 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                size="icon"
                className="shrink-0 h-11 w-11 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary via-primary to-primary/90"
              >
                {sending ? (
                  <Clock className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
