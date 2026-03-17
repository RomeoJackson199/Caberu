import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Send, Search, Clock, ChevronDown, FileText, Loader2, MessageCircle, CheckCheck, Check, X, Calendar, User } from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, isSameDay } from 'date-fns';

interface Conversation {
  phone: string;
  patient_id: string | null;
  patient_name: string;
  last_message: string;
  last_message_at: string | null;
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
  {
    name: 'Appointment Confirmation',
    sid: 'HXb42396a8935679888be901c6511d346e',
    key: 'appointment_confirmation',
    description: 'Confirm an upcoming appointment',
    icon: '📅',
  },
  {
    name: 'Appointment Reminder (24h)',
    sid: 'HX9f28be56e75885c418443bc07b6ff4bb',
    key: 'appointment_reminder_24h',
    description: 'Remind patient of tomorrow\'s visit',
    icon: '⏰',
  },
  {
    name: 'Payment Reminder',
    sid: 'HXb41dcf0777fc125449965c46564f2f2b',
    key: 'payment_reminder',
    description: 'Request outstanding payment',
    icon: '💳',
  },
  {
    name: 'Patient Welcome',
    sid: 'HX6200ec02afae9fdf60b8f886aa5dcf32',
    key: 'patient_welcome',
    description: 'Welcome a new patient',
    icon: '👋',
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
    'bg-teal-500', 'bg-cyan-500', 'bg-orange-500', 'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yy');
}

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  let label: string;
  if (isToday(d)) label = 'Today';
  else if (isYesterday(d)) label = 'Yesterday';
  else label = format(d, 'MMMM d, yyyy');

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function MessageStatus({ status }: { status: string }) {
  if (status === 'delivered' || status === 'read') return <CheckCheck className="h-3 w-3 inline ml-1 text-green-200" />;
  if (status === 'sent') return <Check className="h-3 w-3 inline ml-1 text-green-200/70" />;
  if (status === 'failed') return <X className="h-3 w-3 inline ml-1 text-red-300" />;
  return null;
}

export default function WhatsAppInbox() {
  const { businessId, businessName } = useBusinessContext();
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
  const [upcomingAppointments, setUpcomingAppointments] = useState<{ id: string; appointment_date: string; reason: string | null; status: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConversation = conversations.find(c => c.phone === selectedPhone);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!businessId) return;
    try {
      const [{ data, error }, { data: aptData }] = await Promise.all([
        supabase.functions.invoke('whatsapp-send', {
          body: { action: 'get_conversations', business_id: businessId },
        }),
        supabase
          .from('appointments')
          .select('patient_id')
          .eq('business_id', businessId),
      ]);

      const existingConversations: Conversation[] = (!error && data?.conversations) ? data.conversations : [];
      const uniquePatientIds = [...new Set((aptData || []).map((a: { patient_id: string }) => a.patient_id).filter(Boolean))];
      let allPatientConvs: Conversation[] = [...existingConversations];

      if (uniquePatientIds.length > 0) {
        const existingPhones = new Set(existingConversations.map((c: Conversation) => c.phone));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone')
          .in('id', uniquePatientIds)
          .not('phone', 'is', null);

        const newPatients: Conversation[] = (profiles || [])
          .filter((p: { id: string; first_name: string | null; last_name: string | null; phone: string }) => p.phone && !existingPhones.has(p.phone))
          .map((p: { id: string; first_name: string | null; last_name: string | null; phone: string }) => ({
            phone: p.phone,
            patient_id: p.id,
            patient_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.phone,
            last_message: '',
            last_message_at: null,
            last_direction: '',
            unread_count: 0,
            window_open: false,
          }));

        allPatientConvs = [...existingConversations, ...newPatients];
      }

      setConversations(allPatientConvs);
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
      await supabase.functions.invoke('whatsapp-send', {
        body: { action: 'mark_read', business_id: businessId, phone },
      });
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

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
      if (selectedConversation?.patient_id) {
        fetchUpcomingAppointments(selectedConversation.patient_id);
      }
    }
  }, [selectedPhone, fetchMessages, selectedConversation?.patient_id, fetchUpcomingAppointments]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel('whatsapp-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `business_id=eq.${businessId}` },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.phone === selectedPhone) {
            setMessages(prev => [...prev, msg]);
          }
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
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (templateSid: string, templateKey: string) => {
    if (!selectedPhone || !businessId || sending) return;
    setSending(true);
    try {
      const firstName = selectedConversation?.patient_name?.split(' ')[0] || 'Patient';
      const biz = businessName || '';
      const apt = upcomingAppointments[0];
      const aptDate = apt ? new Date(apt.appointment_date) : null;
      const fmtDate = aptDate ? `${aptDate.getDate()}-${aptDate.getMonth() + 1}` : '';
      const fmtTime = aptDate ? `${String(aptDate.getHours()).padStart(2, '0')}:${String(aptDate.getMinutes()).padStart(2, '0')}` : '';

      const variablesByTemplate: Record<string, Record<string, string>> = {
        appointment_confirmation: { "1": firstName, "2": biz, "3": fmtDate, "4": fmtTime },
        appointment_reminder_24h: { "1": firstName, "2": fmtDate, "3": fmtTime },
        payment_reminder:         { "1": firstName, "2": '€0.00', "3": biz },
        patient_welcome:          { "1": firstName, "2": biz, "3": 'caberu.be/login' },
      };

      await supabase.functions.invoke('whatsapp-send', {
        body: {
          action: 'send_template',
          phone: selectedPhone,
          content_sid: templateSid,
          content_variables: variablesByTemplate[templateKey] ?? { "1": firstName },
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

  // Group messages by date for separators
  const messagesWithSeparators = messages.reduce<{ type: 'separator' | 'message'; date?: string; msg?: Message }[]>((acc, msg, i) => {
    const prev = messages[i - 1];
    if (!prev || !isSameDay(new Date(msg.created_at), new Date(prev.created_at))) {
      acc.push({ type: 'separator', date: msg.created_at });
    }
    acc.push({ type: 'message', msg });
    return acc;
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Left panel — Conversations */}
      <div className="w-[300px] border-r border-border flex flex-col bg-card">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-foreground text-sm">WhatsApp</h2>
            </div>
            {totalUnread > 0 && (
              <Badge className="bg-green-600 hover:bg-green-600 h-5 text-xs">
                {totalUnread}
              </Badge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-background"
            />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No matches found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const initials = getInitials(conv.patient_name);
              const avatarColor = getAvatarColor(conv.patient_name);
              const isSelected = selectedPhone === conv.phone;

              return (
                <button
                  key={conv.phone}
                  onClick={() => setSelectedPhone(conv.phone)}
                  className={cn(
                    'w-full px-3 py-3 text-left border-b border-border/40 hover:bg-accent/60 transition-colors relative',
                    isSelected && 'bg-accent border-l-2 border-l-green-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0', avatarColor)}>
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn('text-sm truncate', conv.unread_count > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
                          {conv.patient_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {conv.last_message_at ? formatMessageDate(conv.last_message_at) : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className={cn('text-xs truncate', conv.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                          {conv.last_message_at ? (
                            <>
                              {conv.last_direction === 'outbound' && (
                                <CheckCheck className="h-3 w-3 inline mr-0.5 text-green-500" />
                              )}
                              {conv.last_message || <span className="italic">Template sent</span>}
                            </>
                          ) : (
                            <span className="italic text-muted-foreground/70">No messages yet</span>
                          )}
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="bg-green-600 hover:bg-green-600 h-4 min-w-[16px] text-[10px] px-1 shrink-0">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Window status dot */}
                  <div className={cn(
                    'absolute bottom-2 left-[42px] w-2.5 h-2.5 rounded-full border-2 border-card',
                    conv.window_open ? 'bg-green-500' : 'bg-amber-400'
                  )} />
                </button>
              );
            })
          )}
        </ScrollArea>

        {/* Legend */}
        <div className="px-3 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Free text</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Template only</span>
        </div>
      </div>

      {/* Right panel — Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedPhone ? (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto">
                <MessageCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">WhatsApp Inbox</p>
                <p className="text-xs text-muted-foreground mt-1">Select a conversation to view messages</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0',
                getAvatarColor(selectedConversation?.patient_name || '')
              )}>
                {getInitials(selectedConversation?.patient_name || '?')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm leading-tight">
                  {selectedConversation?.patient_name}
                </h3>
                <p className="text-xs text-muted-foreground">{selectedPhone}</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs shrink-0',
                  selectedConversation?.window_open
                    ? 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30'
                    : 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30'
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {selectedConversation?.window_open ? 'Free text open' : 'Template only'}
              </Badge>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 bg-muted/10">
              <div className="p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground/70">Send a template to start the conversation</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {messagesWithSeparators.map((item, i) => {
                      if (item.type === 'separator') {
                        return <DateSeparator key={`sep-${i}`} date={item.date!} />;
                      }
                      const msg = item.msg!;
                      const isOutbound = msg.direction === 'outbound';
                      return (
                        <div
                          key={msg.id}
                          className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[72%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                              isOutbound
                                ? 'bg-green-600 text-white rounded-br-sm'
                                : 'bg-card text-foreground rounded-bl-sm border border-border/60'
                            )}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">
                              {msg.body || (
                                <span className="italic opacity-80">
                                  📋 {msg.template_name?.replace(/_/g, ' ') || 'Template message'}
                                </span>
                              )}
                            </p>
                            <div className={cn(
                              'text-[10px] mt-1 flex items-center justify-end gap-0.5',
                              isOutbound ? 'text-green-100/80' : 'text-muted-foreground'
                            )}>
                              {format(new Date(msg.created_at), 'HH:mm')}
                              {isOutbound && <MessageStatus status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Upcoming appointments collapsible */}
            {selectedConversation?.patient_id && upcomingAppointments.length > 0 && (
              <Collapsible open={remindersOpen} onOpenChange={setRemindersOpen}>
                <CollapsibleTrigger className="w-full px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground hover:bg-accent/40 transition-colors">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-green-600" />
                    Upcoming Appointments
                    <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{upcomingAppointments.length}</Badge>
                  </span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', remindersOpen && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border/50 px-4 py-2 bg-muted/20 max-h-36 overflow-auto space-y-1.5">
                    {upcomingAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-foreground font-medium">
                            {format(new Date(apt.appointment_date), 'MMM d, HH:mm')}
                          </span>
                          <span className="text-muted-foreground">— {apt.reason || 'General'}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-4 capitalize">{apt.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Input area */}
            <div className="p-3 border-t border-border bg-card">
              {/* Template picker */}
              {showTemplates && (
                <div className="mb-2 rounded-xl border border-border bg-card shadow-md overflow-hidden">
                  <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Message Templates</p>
                    <button
                      onClick={() => setShowTemplates(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-border/40">
                    {TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.sid}
                        onClick={() => handleSendTemplate(tmpl.sid, tmpl.key)}
                        disabled={sending}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent/60 transition-colors flex items-start gap-2.5 disabled:opacity-50"
                      >
                        <span className="text-base shrink-0 mt-0.5">{tmpl.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight">{tmpl.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('shrink-0 h-9 w-9', showTemplates && 'bg-accent text-accent-foreground')}
                  onClick={() => setShowTemplates(!showTemplates)}
                  title="Message templates"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <div className="relative flex-1">
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
                    className="h-9 pr-2"
                  />
                  {!selectedConversation?.window_open && (
                    <div className="absolute inset-0 rounded-md bg-muted/20 flex items-center justify-center pointer-events-none">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Use a template to reach this patient
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="icon"
                  className="shrink-0 h-9 w-9 bg-green-600 hover:bg-green-700"
                  onClick={handleSendFreeform}
                  disabled={!newMessage.trim() || !selectedConversation?.window_open || sending}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              {/* User hint */}
              {selectedConversation && !selectedConversation.window_open && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  24-hour session closed. Click <FileText className="h-3 w-3 inline" /> to send a pre-approved template.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
