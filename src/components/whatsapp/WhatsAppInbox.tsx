import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Phone, Send, Search, Clock, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Conversation {
  phone: string;
  patient_id: string | null;
  patient_name: string;
  last_message: string;
  last_message_at: string;
  last_direction: string;
  unread_count: number;
  window_open: boolean;
}

interface Message {
  id: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  body: string | null;
  template_name: string | null;
  template_sid: string | null;
  status: string;
  is_read: boolean;
  created_at: string;
}

const TEMPLATES = [
  { name: 'Appointment Confirmation', sid: 'HXb42396a8935679888be901c6511d346e', key: 'appointment_confirmation' },
  { name: 'Appointment Reminder (24h)', sid: 'HX9f28be56e75885c418443bc07b6ff4bb', key: 'appointment_reminder_24h' },
  { name: 'Payment Reminder', sid: 'HXb41dcf0777fc125449965c46564f2f2b', key: 'payment_reminder' },
  { name: 'Patient Welcome', sid: 'HX6200ec02afae9fdf60b8f886aa5dcf32', key: 'patient_welcome' },
];

export default function WhatsAppInbox() {
  const { businessId } = useBusinessContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  const selectedConversation = conversations.find(c => c.phone === selectedPhone);

  const fetchConversations = useCallback(async () => {
    if (!businessId) return;
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { action: 'get_conversations', business_id: businessId },
      });
      if (!error && data?.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const fetchMessages = useCallback(async (phone: string) => {
    if (!businessId) return;
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { action: 'get_messages', business_id: businessId, phone },
      });
      if (!error && data?.messages) {
        setMessages(data.messages);
      }

      // Mark as read
      await supabase.functions.invoke('whatsapp-send', {
        body: { action: 'mark_read', business_id: businessId, phone },
      });

      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [businessId, fetchConversations]);

  const fetchUpcomingAppointments = useCallback(async (patientId: string) => {
    if (!businessId || !patientId) return;
    const { data } = await supabase
      .from('appointments')
      .select('id, appointment_date, reason, status')
      .eq('patient_id', patientId)
      .eq('business_id', businessId)
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true })
      .limit(5);
    setUpcomingAppointments(data || []);
  }, [businessId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
      if (selectedConversation?.patient_id) {
        fetchUpcomingAppointments(selectedConversation.patient_id);
      }
    }
  }, [selectedPhone, fetchMessages, selectedConversation?.patient_id, fetchUpcomingAppointments]);

  // Realtime subscription
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel('whatsapp-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `business_id=eq.${businessId}` },
        (payload) => {
          const msg = payload.new as Message;
          // If it's for the current conversation, add it
          if (msg.phone === selectedPhone) {
            setMessages(prev => [...prev, msg]);
          }
          // Refresh conversations list
          fetchConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId, selectedPhone, fetchConversations]);

  const handleSendFreeform = async () => {
    if (!newMessage.trim() || !selectedPhone || !businessId || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          action: 'send_freeform',
          phone: selectedPhone,
          message: newMessage.trim(),
          business_id: businessId,
          patient_id: selectedConversation?.patient_id,
        },
      });
      if (!error && data?.success) {
        setNewMessage('');
        fetchMessages(selectedPhone);
      } else {
        console.error('Send failed:', data?.error || error);
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (templateSid: string, templateKey: string) => {
    if (!selectedPhone || !businessId || sending) return;
    setSending(true);
    try {
      await supabase.functions.invoke('whatsapp-send', {
        body: {
          action: 'send_template',
          phone: selectedPhone,
          content_sid: templateSid,
          content_variables: { "1": selectedConversation?.patient_name || 'Patient' },
          business_id: businessId,
          patient_id: selectedConversation?.patient_id,
          template_name: templateKey,
        },
      });
      fetchMessages(selectedPhone);
      setShowTemplates(false);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-xl border border-border bg-card overflow-hidden">
      {/* Left panel - Conversations */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-foreground">WhatsApp</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                className={cn(
                  'w-full px-3 py-3 text-left border-b border-border/50 hover:bg-accent/50 transition-colors',
                  selectedPhone === conv.phone && 'bg-accent'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {conv.patient_name}
                      </span>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="h-5 min-w-[20px] text-xs bg-green-600 hover:bg-green-600">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_direction === 'outbound' && '✓ '}
                      {conv.last_message}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Right panel - Chat */}
      <div className="flex-1 flex flex-col">
        {!selectedPhone ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{selectedConversation?.patient_name}</h3>
                <p className="text-xs text-muted-foreground">{selectedPhone}</p>
              </div>
              {/* 24h window indicator */}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  selectedConversation?.window_open
                    ? 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30'
                    : 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30'
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {selectedConversation?.window_open ? 'Free text available' : 'Template only'}
              </Badge>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No messages yet. Send a template to start the conversation.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                          msg.direction === 'outbound'
                            ? 'bg-green-600 text-white rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        )}
                      >
                        {msg.body || `📋 ${msg.template_name || 'Template message'}`}
                        <div className={cn(
                          'text-[10px] mt-1',
                          msg.direction === 'outbound' ? 'text-green-200' : 'text-muted-foreground'
                        )}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                          {msg.direction === 'outbound' && (
                            <span className="ml-1">
                              {msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'failed' ? '✗' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Upcoming reminders collapsible */}
            {selectedConversation?.patient_id && upcomingAppointments.length > 0 && (
              <Collapsible open={remindersOpen} onOpenChange={setRemindersOpen}>
                <CollapsibleTrigger className="w-full px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground hover:bg-accent/50">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Upcoming Appointments ({upcomingAppointments.length})
                  </span>
                  <ChevronDown className={cn('h-3 w-3 transition-transform', remindersOpen && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border/50 px-4 py-2 bg-muted/30 max-h-32 overflow-auto">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-foreground">
                        {format(new Date(apt.appointment_date), 'MMM d, HH:mm')} — {apt.reason || 'General'}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {apt.status}
                      </Badge>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Input area */}
            <div className="p-3 border-t border-border">
              {/* Template picker */}
              {showTemplates && (
                <div className="mb-2 p-2 rounded-lg border border-border bg-muted/50 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Send a template:</p>
                  {TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.sid}
                      onClick={() => handleSendTemplate(tmpl.sid, tmpl.key)}
                      disabled={sending}
                      className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-foreground"
                    >
                      📋 {tmpl.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowTemplates(!showTemplates)}
                  title="Templates"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Input
                  placeholder={
                    selectedConversation?.window_open
                      ? 'Type a message...'
                      : 'Session expired — use a template'
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendFreeform()}
                  disabled={!selectedConversation?.window_open || sending}
                  className="h-9"
                />
                <Button
                  size="icon"
                  className="shrink-0 bg-green-600 hover:bg-green-700"
                  onClick={handleSendFreeform}
                  disabled={!newMessage.trim() || !selectedConversation?.window_open || sending}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
