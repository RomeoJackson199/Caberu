import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Send, Search, Clock, ChevronDown, FileText, Loader2, MessageCircle, CheckCheck, Check, X, Calendar, Phone, Smile, ArrowLeft } from 'lucide-react';
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
    color: 'from-blue-500/10 to-blue-500/5 border-blue-200/60 dark:border-blue-800/40',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    // {{1}} firstName, {{2}} businessName, {{3}} date, {{4}} time
    bodyTemplate: 'Hi {{1}}, your appointment at {{2}} on {{3}} at {{4}} is confirmed. See you then! 😊',
  },
  {
    name: 'Appointment Reminder (24h)',
    sid: 'HX9f28be56e75885c418443bc07b6ff4bb',
    key: 'appointment_reminder_24h',
    description: 'Remind patient of tomorrow\'s visit',
    icon: '⏰',
    color: 'from-purple-500/10 to-purple-500/5 border-purple-200/60 dark:border-purple-800/40',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    // {{1}} firstName, {{2}} date, {{3}} time
    bodyTemplate: 'Hi {{1}}, just a reminder about your appointment tomorrow on {{2}} at {{3}}. See you soon! 🦷',
  },
  {
    name: 'Payment Reminder',
    sid: 'HXb41dcf0777fc125449965c46564f2f2b',
    key: 'payment_reminder',
    description: 'Request outstanding payment',
    icon: '💳',
    color: 'from-orange-500/10 to-orange-500/5 border-orange-200/60 dark:border-orange-800/40',
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    // {{1}} firstName, {{2}} amount, {{3}} businessName
    bodyTemplate: 'Hi {{1}}, you have an outstanding balance of {{2}} at {{3}}. Please contact us to settle your payment. Thank you!',
  },
  {
    name: 'Patient Welcome',
    sid: 'HX6200ec02afae9fdf60b8f886aa5dcf32',
    key: 'patient_welcome',
    description: 'Welcome a new patient',
    icon: '👋',
    color: 'from-green-500/10 to-green-500/5 border-green-200/60 dark:border-green-800/40',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    // {{1}} firstName, {{2}} businessName, {{3}} portal url
    bodyTemplate: 'Welcome {{1}}! 🎉 Thank you for choosing {{2}}. You can access your patient portal at {{3}}. We look forward to seeing you!',
  },
];

function renderTemplateBody(bodyTemplate: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    bodyTemplate
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-indigo-400 to-indigo-600',
    'from-teal-400 to-teal-600',
    'from-cyan-400 to-cyan-600',
    'from-orange-400 to-orange-600',
    'from-rose-400 to-rose-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
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
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <span className="text-[11px] font-medium text-muted-foreground/80 bg-background/80 backdrop-blur-sm border border-border/40 px-3 py-1 rounded-full shadow-sm">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
    </div>
  );
}

function MessageStatus({ status }: { status: string }) {
  if (status === 'delivered' || status === 'read') return <CheckCheck className="h-3 w-3 inline ml-1 text-green-200" />;
  if (status === 'sent') return <Check className="h-3 w-3 inline ml-1 text-green-200/70" />;
  if (status === 'failed') return <X className="h-3 w-3 inline ml-1 text-red-300" />;
  return null;
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const gradient = getAvatarGradient(name);
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-bold shrink-0 bg-gradient-to-br shadow-sm',
      gradient, sizeClass
    )}>
      {getInitials(name)}
    </div>
  );
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

      const variables = variablesByTemplate[templateKey] ?? { "1": firstName };
      const tmpl = TEMPLATES.find(t => t.key === templateKey);
      const renderedBody = tmpl ? renderTemplateBody(tmpl.bodyTemplate, variables) : undefined;

      await supabase.functions.invoke('whatsapp-send', {
        body: {
          action: 'send_template',
          phone: selectedPhone,
          content_sid: templateSid,
          content_variables: variables,
          business_id: businessId,
          patient_id: selectedConversation?.patient_id,
          template_name: templateKey,
          rendered_body: renderedBody,
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
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-xl border border-border/50 bg-card">

      {/* ── Left panel ── */}
      <div className={cn(
        "border-r border-border/50 flex flex-col bg-card",
        // Mobile: full width when no conversation selected, hidden when chat open
        "w-full md:w-[320px]",
        selectedPhone ? "hidden md:flex" : "flex"
      )}>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#075e54] to-[#128c7e] px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm leading-none">WhatsApp</h2>
                <p className="text-[10px] text-white/60 mt-0.5">Inbox</p>
              </div>
            </div>
            {totalUnread > 0 && (
              <div className="bg-[#25d366] text-white text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 shadow-sm">
                {totalUnread}
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
            <input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-lg bg-white/15 text-white placeholder:text-white/50 text-sm border-0 outline-none focus:ring-1 focus:ring-white/30 transition-all"
            />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 bg-card">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#075e54]/10 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#075e54]" />
                </div>
                <p className="text-xs text-muted-foreground">Loading conversations…</p>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <MessageCircle className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {searchQuery ? 'Try a different search' : 'Patients will appear here once they message you'}
              </p>
            </div>
          ) : (
            <div>
              {filteredConversations.map((conv, idx) => {
                const isSelected = selectedPhone === conv.phone;
                return (
                  <button
                    key={conv.phone}
                    onClick={() => setSelectedPhone(conv.phone)}
                    className={cn(
                      'w-full px-4 py-3.5 text-left transition-all duration-150 relative group',
                      idx !== filteredConversations.length - 1 && 'border-b border-border/30',
                      isSelected
                        ? 'bg-[#075e54]/8 dark:bg-[#25d366]/10'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#25d366] rounded-r-full" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={conv.patient_name} />
                        <div className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
                          conv.window_open ? 'bg-[#25d366]' : 'bg-amber-400'
                        )} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            'text-sm truncate',
                            conv.unread_count > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                          )}>
                            {conv.patient_name}
                          </span>
                          <span className={cn(
                            'text-[10px] whitespace-nowrap shrink-0',
                            conv.unread_count > 0 ? 'text-[#25d366] font-medium' : 'text-muted-foreground'
                          )}>
                            {conv.last_message_at ? formatMessageDate(conv.last_message_at) : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={cn(
                            'text-xs truncate',
                            conv.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                          {conv.last_message_at ? (
                              <>
                                {conv.last_direction === 'outbound' && (
                                  <CheckCheck className="h-3 w-3 inline mr-0.5 text-[#25d366]" />
                                )}
                                {conv.last_message && !conv.last_message.startsWith('[Template:')
                                  ? conv.last_message
                                  : <span className="italic">📋 Template message sent</span>
                                }
                              </>
                            ) : (
                              <span className="italic text-muted-foreground/60">No messages yet</span>
                            )}
                          </p>
                          {conv.unread_count > 0 && (
                            <div className="bg-[#25d366] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shrink-0">
                              {conv.unread_count}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Legend */}
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20 flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-[#25d366] shadow-sm" />
            Free text open
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
            Template only
          </span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        // Mobile: full width when conversation selected, hidden otherwise
        selectedPhone ? "flex" : "hidden md:flex"
      )}>
        {!selectedPhone ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23075e54' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            <div className="text-center space-y-4 p-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#075e54]/15 to-[#25d366]/10 flex items-center justify-center mx-auto shadow-inner">
                <MessageCircle className="h-12 w-12 text-[#075e54]/50 dark:text-[#25d366]/50" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">WhatsApp Inbox</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-[220px] mx-auto leading-relaxed">
                  Select a conversation from the list to start messaging
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{conversations.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Contacts</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#25d366]">{totalUnread}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Unread</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-gradient-to-r from-[#075e54] to-[#128c7e] px-4 py-3 flex items-center gap-3 shadow-sm">
              {/* Back button — mobile only */}
              <button
                className="md:hidden shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                onClick={() => setSelectedPhone(null)}
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </button>
              <Avatar name={selectedConversation?.patient_name || '?'} size="md" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm leading-tight">
                  {selectedConversation?.patient_name}
                </h3>
                <p className="text-[11px] text-white/60 flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" />
                  {selectedPhone}
                </p>
              </div>
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm',
                selectedConversation?.window_open
                  ? 'bg-[#25d366]/20 border-[#25d366]/40 text-white'
                  : 'bg-amber-400/20 border-amber-400/40 text-white'
              )}>
                <Clock className="h-3 w-3" />
                {selectedConversation?.window_open ? 'Session open' : 'Template only'}
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea
              className="flex-1"
              style={{
                background: 'hsl(var(--muted) / 0.15)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23075e54' fill-opacity='0.025'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              <div className="p-4 pb-2">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#075e54]/10 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-[#075e54]" />
                      </div>
                      <p className="text-xs text-muted-foreground">Loading messages…</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-[#075e54]/10 flex items-center justify-center mx-auto">
                      <Smile className="h-8 w-8 text-[#075e54]/40" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground/70">Send a template to kick off the conversation</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {messagesWithSeparators.map((item, i) => {
                      if (item.type === 'separator') {
                        return <DateSeparator key={`sep-${i}`} date={item.date!} />;
                      }
                      const msg = item.msg!;
                      const isOutbound = msg.direction === 'outbound';
                      return (
                        <div
                          key={msg.id}
                          className={cn('flex mb-1', isOutbound ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[68%] px-3.5 py-2 text-sm shadow-md relative',
                              isOutbound
                                ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100 rounded-2xl rounded-br-sm'
                                : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm border border-black/5 dark:border-white/5'
                            )}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">
                              {(() => {
                                // If body exists and is not a raw template placeholder, show it
                                if (msg.body && !msg.body.startsWith('[Template:')) {
                                  return msg.body;
                                }
                                // Try to render the template content from the known templates
                                if (msg.template_name) {
                                  const tmpl = TEMPLATES.find(t => t.key === msg.template_name);
                                  if (tmpl) {
                                    const firstName = selectedConversation?.patient_name?.split(' ')[0] || 'Patient';
                                    const biz = businessName || '';
                                    const variablesByTemplate: Record<string, Record<string, string>> = {
                                      appointment_confirmation: { "1": firstName, "2": biz, "3": "—", "4": "—" },
                                      appointment_reminder_24h: { "1": firstName, "2": "—", "3": "—" },
                                      payment_reminder: { "1": firstName, "2": "€—", "3": biz },
                                      patient_welcome: { "1": firstName, "2": biz, "3": "caberu.be/login" },
                                    };
                                    const vars = variablesByTemplate[msg.template_name] || { "1": firstName };
                                    return (
                                      <span className="opacity-90">
                                        📋 {renderTemplateBody(tmpl.bodyTemplate, vars)}
                                      </span>
                                    );
                                  }
                                }
                                return (
                                  <span className="italic opacity-70">
                                    📋 {msg.template_name?.replace(/_/g, ' ') || 'Template message'}
                                  </span>
                                );
                              })()}
                            </p>
                            <div className={cn(
                              'text-[10px] mt-1 flex items-center justify-end gap-0.5',
                              isOutbound
                                ? 'text-gray-500 dark:text-[#8696a0]'
                                : 'text-gray-400 dark:text-[#8696a0]'
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

            {/* Upcoming appointments */}
            {selectedConversation?.patient_id && upcomingAppointments.length > 0 && (
              <Collapsible open={remindersOpen} onOpenChange={setRemindersOpen}>
                <CollapsibleTrigger className="w-full px-4 py-2.5 border-t border-border/40 bg-card flex items-center justify-between text-xs hover:bg-accent/30 transition-colors">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <div className="w-5 h-5 rounded-full bg-[#075e54]/10 flex items-center justify-center">
                      <Calendar className="h-3 w-3 text-[#075e54]" />
                    </div>
                    Upcoming Appointments
                    <span className="bg-[#075e54]/10 text-[#075e54] dark:text-[#25d366] text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      {upcomingAppointments.length}
                    </span>
                  </span>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', remindersOpen && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border/30 px-4 py-2 bg-muted/20 max-h-36 overflow-auto space-y-1.5">
                    {upcomingAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-accent/40 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#25d366]" />
                          <span className="text-foreground font-medium">
                            {format(new Date(apt.appointment_date), 'MMM d, HH:mm')}
                          </span>
                          <span className="text-muted-foreground">— {apt.reason || 'General'}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-4 capitalize border-border/50">{apt.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Input area */}
            <div className="px-3 py-3 border-t border-border/40 bg-card/95 backdrop-blur-sm">
              {/* Template picker */}
              {showTemplates && (
                <div className="mb-3 rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-[#075e54]" />
                      <p className="text-xs font-semibold text-foreground">Message Templates</p>
                    </div>
                    <button
                      onClick={() => setShowTemplates(false)}
                      className="w-5 h-5 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                    {TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.sid}
                        onClick={() => handleSendTemplate(tmpl.sid, tmpl.key)}
                        disabled={sending}
                        className={cn(
                          'text-left p-3 rounded-xl border bg-gradient-to-br transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none',
                          tmpl.color
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2 text-base', tmpl.iconBg)}>
                          {tmpl.icon}
                        </div>
                        <p className="text-xs font-semibold text-foreground leading-tight">{tmpl.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{tmpl.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  className={cn(
                    'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    showTemplates
                      ? 'bg-[#075e54] text-white shadow-md'
                      : 'bg-muted hover:bg-[#075e54]/10 text-muted-foreground hover:text-[#075e54]'
                  )}
                  onClick={() => setShowTemplates(!showTemplates)}
                  title="Message templates"
                >
                  <FileText className="h-4 w-4" />
                </button>

                <div className="relative flex-1">
                  <Input
                    placeholder={
                      selectedConversation?.window_open
                        ? 'Type a message…'
                        : 'Session expired — use a template'
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendFreeform()}
                    disabled={!selectedConversation?.window_open || sending}
                    className="h-10 rounded-full bg-muted/60 border-border/40 focus-visible:ring-[#075e54]/30 pr-4 pl-4 text-sm"
                  />
                </div>

                <button
                  className={cn(
                    'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm',
                    (!newMessage.trim() || !selectedConversation?.window_open || sending)
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-[#25d366] hover:bg-[#1dbc5a] text-white hover:shadow-md hover:scale-105'
                  )}
                  onClick={handleSendFreeform}
                  disabled={!newMessage.trim() || !selectedConversation?.window_open || sending}
                >
                  {sending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </button>
              </div>

              {selectedConversation && !selectedConversation.window_open && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 pl-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  24-hour session closed. Use the template button to send a pre-approved message.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
