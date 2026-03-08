import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { getCurrentBusinessId } from '@/lib/businessUtils';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Contact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
  businessId: string;
  businessName?: string;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount: number;
}

interface ConversationListProps {
  currentUserId: string;
  onSelectRecipient: (recipient: { id: string; name: string; businessId: string; profilePictureUrl?: string | null }) => void;
}

export function ConversationList({ currentUserId, onSelectRecipient }: ConversationListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDentist, setIsDentist] = useState(false);
  const [roleDetected, setRoleDetected] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    detectRoleAndLoad();
  }, [currentUserId]);

  const detectRoleAndLoad = async () => {
    setLoading(true);
    setBusinessError(null);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      const { data: dentistData } = await supabase
        .from('dentists')
        .select('id, is_active')
        .eq('profile_id', profile.id)
        .maybeSingle();

      const isDentistUser = !!dentistData && dentistData.is_active;
      setIsDentist(isDentistUser);
      setRoleDetected(true);

      await loadContactsWithConversations(profile.id, isDentistUser, dentistData?.id);
      setupRealtimeSubscription(profile.id);
    } catch (error) {
      console.error('[ConversationList] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContactsWithConversations = async (profileId: string, isDentistUser: boolean, dentistId?: string) => {
    try {
      setBusinessError(null);

      // 1. Load all messages to build conversation data
      const { data: messagesData } = await supabase
        .from('messages_decrypted' as any)
        .select('sender_profile_id, recipient_profile_id, message_text, created_at, is_read, business_id')
        .or(`sender_profile_id.eq.${profileId},recipient_profile_id.eq.${profileId}`)
        .order('created_at', { ascending: false });

      const conversationMap = new Map<string, { lastMessage: string; lastMessageTime: string; businessId: string; unreadCount: number }>();

      messagesData?.forEach((msg: any) => {
        const partnerId = msg.sender_profile_id === profileId
          ? msg.recipient_profile_id
          : msg.sender_profile_id;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            lastMessage: msg.message_text,
            lastMessageTime: msg.created_at,
            businessId: msg.business_id,
            unreadCount: 0,
          });
        }

        if (msg.recipient_profile_id === profileId && !msg.is_read) {
          conversationMap.get(partnerId)!.unreadCount++;
        }
      });

      // 2. Load contacts based on role
      let contactProfiles: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; profile_picture_url: string | null; businessId: string; businessName?: string }[] = [];

      if (!isDentistUser) {
        // Patient: show all dentists from businesses they have appointments with
        const { data: appointments, error: aptErr } = await supabase
          .from('appointments')
          .select('dentist_id, business_id')
          .eq('patient_id', profileId);

        console.debug('[ConversationList] Patient appointments:', appointments?.length, aptErr?.message);

        if (appointments && appointments.length > 0) {
          const dentistIds = Array.from(new Set(appointments.map(a => a.dentist_id).filter(Boolean)));
          const dentistBusinessMap = new Map<string, string>();
          const businessIds = new Set<string>();
          appointments.forEach(a => {
            if (a.dentist_id && a.business_id) {
              if (!dentistBusinessMap.has(a.dentist_id)) dentistBusinessMap.set(a.dentist_id, a.business_id);
              businessIds.add(a.business_id);
            }
          });

          const businessNameMap = new Map<string, string>();
          if (businessIds.size > 0) {
            const { data: businesses } = await supabase.from('businesses').select('id, name').in('id', Array.from(businessIds));
            businesses?.forEach(b => businessNameMap.set(b.id, b.name));
          }

          const { data: dentists } = await supabase.from('dentists').select('id, profile_id').in('id', dentistIds);
          if (dentists && dentists.length > 0) {
            const profileIds = dentists.map(d => d.profile_id).filter(Boolean);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email, phone, profile_picture_url')
              .in('id', profileIds);

            const dentistProfileMap = new Map<string, string>();
            dentists.forEach(d => dentistProfileMap.set(d.profile_id, d.id));

            contactProfiles = (profiles || []).map(p => {
              const dId = dentistProfileMap.get(p.id);
              const bId = dId ? dentistBusinessMap.get(dId) || '' : '';
              return {
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
                email: p.email,
                phone: p.phone,
                profile_picture_url: (p as any).profile_picture_url || null,
                businessId: bId,
                businessName: businessNameMap.get(bId),
              };
            }).filter(c => !!c.businessId);
          }
        }
      } else {
        // Dentist: show all patients they have appointments with + business staff
        let businessId: string;
        try {
          businessId = await getCurrentBusinessId();
        } catch {
          setBusinessError('Please select a clinic to view contacts');
          return;
        }

        // Get patients from appointments
        const { data: appointments } = await supabase
          .from('appointments_decrypted')
          .select('patient_id, business_id')
          .eq('dentist_id', dentistId || '');

        const patientIds = appointments
          ? Array.from(new Set(appointments.map(a => a.patient_id).filter(Boolean)))
          : [];

        // Get business members (staff)
        const { data: members } = await supabase
          .from('business_members')
          .select('profile_id')
          .eq('business_id', businessId);

        const staffIds = members
          ? members.map(m => m.profile_id).filter(Boolean)
          : [];

        const allProfileIds = Array.from(new Set([...patientIds, ...staffIds])).filter(id => id !== profileId);

        if (allProfileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, profile_picture_url')
            .in('id', allProfileIds);

          const staffSet = new Set(staffIds);
          contactProfiles = (profiles || []).map(p => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
            phone: p.phone,
            profile_picture_url: (p as any).profile_picture_url || null,
            businessId,
            businessName: staffSet.has(p.id) ? 'Staff' : undefined,
          }));
        }
      }

      // 3. Merge contacts with conversation data
      const mergedContacts: Contact[] = contactProfiles.map(p => {
        const conv = conversationMap.get(p.id);
        return {
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'User',
          phone: p.phone,
          email: p.email,
          profilePictureUrl: p.profile_picture_url,
          businessId: conv?.businessId || p.businessId,
          businessName: p.businessName,
          lastMessage: conv?.lastMessage || null,
          lastMessageTime: conv?.lastMessageTime || null,
          unreadCount: conv?.unreadCount || 0,
        };
      });

      // Also add conversation partners that aren't in contacts yet
      for (const [partnerId, conv] of conversationMap) {
        if (!mergedContacts.find(c => c.id === partnerId)) {
          const { data: partnerProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, profile_picture_url')
            .eq('id', partnerId)
            .single();

          if (partnerProfile) {
            mergedContacts.push({
              id: partnerProfile.id,
              name: `${partnerProfile.first_name || ''} ${partnerProfile.last_name || ''}`.trim() || 'User',
              phone: partnerProfile.phone,
              email: partnerProfile.email,
              profilePictureUrl: (partnerProfile as any).profile_picture_url || null,
              businessId: conv.businessId,
              lastMessage: conv.lastMessage,
              lastMessageTime: conv.lastMessageTime,
              unreadCount: conv.unreadCount,
            });
          }
        }
      }

      // Sort: unread first, then by last message time, then alphabetically
      mergedContacts.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        if (a.lastMessageTime && b.lastMessageTime) return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        return a.name.localeCompare(b.name);
      });

      setContacts(mergedContacts);
    } catch (error) {
      console.error('[ConversationList] Error loading contacts:', error);
    }
  };

  const setupRealtimeSubscription = (profileId: string) => {
    const channel = supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        detectRoleAndLoad();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(q) ||
      (contact.phone && contact.phone.toLowerCase().includes(q)) ||
      (contact.email && contact.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/10">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-gradient-to-br from-background/95 via-background/95 to-muted/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-heading font-bold text-foreground">Messages</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={detectRoleAndLoad}
            disabled={loading}
            className="h-8 w-8 hover:bg-primary/10 transition-all duration-300"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-border/50 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-300"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
          </div>
        ) : businessError ? (
          <div className="p-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{businessError}</AlertDescription>
            </Alert>
          </div>
        ) : filteredContacts.length > 0 ? (
          <div className="p-2 space-y-1">
            <AnimatePresence>
              {filteredContacts.map((contact) => (
                <motion.button
                  key={contact.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  onClick={() =>
                    onSelectRecipient({
                      id: contact.id,
                      name: contact.name,
                      businessId: contact.businessId,
                      profilePictureUrl: contact.profilePictureUrl,
                    })
                  }
                  className={cn(
                    "w-full p-3 rounded-xl transition-all duration-300 text-left group relative",
                    contact.unreadCount > 0
                      ? "bg-primary/5 hover:bg-primary/10 shadow-sm hover:shadow-md border-l-4 border-l-primary"
                      : "hover:bg-primary/5 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-md border-2 border-primary/10">
                        <AvatarImage src={contact.profilePictureUrl || undefined} className="object-cover" />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {contact.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {contact.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1">
                          <Badge
                            variant="destructive"
                            className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-pulse-soft shadow-lg"
                          >
                            {contact.unreadCount}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span className="font-bold truncate group-hover:text-primary transition-colors">
                          {contact.name}
                        </span>
                        {contact.lastMessageTime && (
                          <span className="text-xs text-muted-foreground shrink-0 font-medium">
                            {formatDistanceToNow(new Date(contact.lastMessageTime), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      {contact.businessName && (
                        <p className="text-xs text-muted-foreground mb-0.5 truncate">
                          {contact.businessName}
                        </p>
                      )}
                      {contact.lastMessage ? (
                        <p
                          className={cn(
                            "text-sm truncate",
                            contact.unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                          )}
                        >
                          {contact.lastMessage}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ) : searchQuery ? (
          <div className="p-8 text-center">
            <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No results for "{searchQuery}"</p>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 shadow-md">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <p className="text-sm font-bold mb-2">No contacts yet</p>
            <p className="text-xs text-muted-foreground max-w-[250px] mx-auto font-medium">
              {roleDetected
                ? isDentist
                  ? 'Your patients will appear here once you have appointments'
                  : 'Your dentists will appear here once you book appointments'
                : 'Loading...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
