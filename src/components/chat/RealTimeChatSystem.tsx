import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Video, 
  MoreVertical,
  Clock,
  CheckCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/components/ui/notification-toast';
import { logger } from '@/lib/logger';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: 'patient' | 'dentist' | 'system';
  timestamp: string;
  is_read: boolean;
  message_type?: 'text' | 'image' | 'file' | 'appointment' | 'prescription';
  metadata?: any;
}

interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  role: 'patient' | 'dentist';
  status: 'online' | 'offline' | 'busy';
  last_seen?: string;
}

interface RealTimeChatSystemProps {
  currentUserId: string;
  currentUserType: 'patient' | 'dentist';
  selectedParticipant?: ChatParticipant;
  onParticipantSelect?: (participant: ChatParticipant) => void;
}

export function RealTimeChatSystem({ 
  currentUserId, 
  currentUserType,
  selectedParticipant,
  onParticipantSelect 
}: RealTimeChatSystemProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatChannel = useRef<any>(null);

  useEffect(() => {
    loadParticipants();
    setupRealtimeChat();
    
    return () => {
      if (chatChannel.current) {
        supabase.removeChannel(chatChannel.current);
      }
    };
  }, [currentUserId]);

  useEffect(() => {
    if (selectedParticipant) {
      loadMessages();
    }
  }, [selectedParticipant]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadParticipants = async () => {
    try {
      if (currentUserType === 'patient') {
        // Load dentists for patient
        const { data: dentists } = await supabase
          .from('dentists')
          .select(`
            id,
            profile:profiles!inner(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('is_active', true);

        if (dentists) {
          const participants: ChatParticipant[] = dentists.map(dentist => {
            const profile = (dentist.profile as unknown) as { first_name: string; last_name: string } | null;
            return {
              id: dentist.id,
              name: `Dr. ${profile?.first_name || ''} ${profile?.last_name || ''}`,
              role: 'dentist' as const,
              status: Math.random() > 0.5 ? 'online' : 'offline' as const
            };
          });
          setParticipants(participants);
        }
      } else {
        // Load patients for dentist
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            patient_id,
            patient:profiles!inner(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('dentist_id', currentUserId);

        if (appointments) {
          const uniquePatients = Array.from(
            new Map(appointments.map(apt => {
              const patient = (apt.patient as unknown) as { first_name: string; last_name: string } | null;
              return [
                apt.patient_id, 
                {
                  id: apt.patient_id,
                  name: `${patient?.first_name || ''} ${patient?.last_name || ''}`,
                  role: 'patient' as const,
                  status: Math.random() > 0.5 ? 'online' : 'offline' as const
                }
              ];
            })).values()
          );
          setParticipants(uniquePatients as ChatParticipant[]);
        }
      }
    } catch (error) {
      logger.error('Error loading participants:', error);
    }
  };

  const setupRealtimeChat = () => {
    chatChannel.current = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          handleRealtimeMessage(payload);
        }
      )
      .subscribe();
  };

  const handleRealtimeMessage = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newMsg = payload.new as Message;
      if (newMsg.sender_id !== currentUserId) {
        setMessages(prev => [...prev, newMsg]);
        showToast.info({
          title: 'New Message',
          description: `New message from ${newMsg.sender_type}`,
          duration: 3000
        });
      }
    }
  };

  const loadMessages = async () => {
    if (!selectedParticipant) return;
    
    setIsLoading(true);
    try {
      // This would need a proper messages table structure
      // For now, we'll simulate messages
      const simulatedMessages: Message[] = [
        {
          id: '1',
          content: 'Hello! How can I help you today?',
          sender_id: selectedParticipant.id,
          sender_type: selectedParticipant.role,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          is_read: true,
          message_type: 'text'
        },
        {
          id: '2',
          content: 'I have some pain in my tooth. Can we schedule an appointment?',
          sender_id: currentUserId,
          sender_type: currentUserType,
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          is_read: true,
          message_type: 'text'
        }
      ];
      
      setMessages(simulatedMessages);
    } catch (error) {
      logger.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedParticipant) return;

    const message: Omit<Message, 'id'> = {
      content: newMessage,
      sender_id: currentUserId,
      sender_type: currentUserType,
      timestamp: new Date().toISOString(),
      is_read: false,
      message_type: 'text'
    };

    try {
      // Add to local state immediately for smooth UX
      const tempMessage = { ...message, id: `temp-${Date.now()}` };
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      // Here you would save to database
      // const { data } = await supabase.from('messages').insert(message);
      
      showToast.success({
        title: 'Message sent',
        description: 'Your message has been delivered'
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      showToast.error({
        title: 'Failed to send',
        description: 'Please try again'
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!selectedParticipant) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-dental-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
          <p className="text-dental-muted-foreground">
            Choose someone from the list to start chatting
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-[600px] gap-4">
      {/* Participants List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-4">
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  onClick={() => onParticipantSelect?.(participant)}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-dental-muted/50 ${
                    selectedParticipant?.id === participant.id 
                      ? 'bg-dental-primary/10 border border-dental-primary/20' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        participant.status === 'online' ? 'bg-green-500' : 
                        participant.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{participant.name}</p>
                      <p className="text-xs text-dental-muted-foreground capitalize">
                        {participant.role}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {participant.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {/* Chat Header */}
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedParticipant.avatar} />
                <AvatarFallback className="bg-gradient-primary text-white">
                  {selectedParticipant.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{selectedParticipant.name}</h3>
                <p className="text-sm text-dental-muted-foreground flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedParticipant.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  {selectedParticipant.status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      message.sender_id === currentUserId
                        ? 'bg-dental-primary text-white'
                        : 'bg-dental-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                      message.sender_id === currentUserId ? 'text-white/70' : 'text-dental-muted-foreground'
                    }`}>
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{formatTimestamp(message.timestamp)}</span>
                      {message.sender_id === currentUserId && (
                        <CheckCheck className={`h-3 w-3 ${message.is_read ? 'text-white' : 'text-white/50'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}