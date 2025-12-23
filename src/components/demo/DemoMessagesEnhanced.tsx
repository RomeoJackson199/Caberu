/**
 * Enhanced Messages Demo with improved UX
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Phone, Video, MoreVertical } from "lucide-react";
import { 
  AvatarWithInitials, 
  MessageStatus,
  UnreadBadge,
  DebouncedSearch
} from "@/components/ui/page-enhancements";
import { TypingIndicator, StaggeredList } from "@/components/ui/micro-interactions";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function DemoMessagesEnhanced() {
  const [selectedConversation, setSelectedConversation] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const conversations = [
    {
      patient: "Sarah Johnson",
      preview: "Thank you for the appointment reminder!",
      time: "10 min ago",
      unread: 2,
      online: true,
    },
    {
      patient: "John Smith",
      preview: "Can I reschedule my appointment?",
      time: "1 hour ago",
      unread: 1,
      online: false,
    },
    {
      patient: "Mike Davis",
      preview: "Thanks for the cleaning today!",
      time: "2 hours ago",
      unread: 0,
      online: true,
    },
    {
      patient: "Emma Wilson",
      preview: "Do I need to bring anything?",
      time: "Yesterday",
      unread: 0,
      online: false,
    },
  ];

  const messages = [
    { id: 1, text: "Hi! I received the reminder for my appointment tomorrow at 10 AM. Thank you!", time: "10:25 AM", isOwn: false, status: "read" as const },
    { id: 2, text: "Great! Looking forward to seeing you tomorrow. Please arrive 10 minutes early.", time: "10:26 AM", isOwn: true, status: "read" as const },
    { id: 3, text: "Will do! Thanks!", time: "10:27 AM", isOwn: false, status: "read" as const },
  ];

  return (
    <div className="p-6 space-y-6" data-tour="messages-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Messages</h1>
          <p className="text-muted-foreground mt-1">
            {conversations.filter(c => c.unread > 0).length} unread conversations
          </p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
          <MessageSquare className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[500px]">
          {/* Conversation List */}
          <div className="border-r border-border">
            <div className="p-4 border-b border-border">
              <DebouncedSearch placeholder="Search conversations..." onSearch={() => {}} />
            </div>
            <StaggeredList className="divide-y divide-border" staggerDelay={0.05}>
              {conversations.map((conv, idx) => (
                <motion.div
                  key={idx}
                  onClick={() => setSelectedConversation(idx)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    selectedConversation === idx ? "bg-primary/5" : "hover:bg-muted/50"
                  )}
                  whileHover={{ x: 2 }}
                >
                  <div className="flex items-center gap-3">
                    <AvatarWithInitials 
                      name={conv.patient} 
                      size="md"
                      showStatus
                      status={conv.online ? "online" : "offline"}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate">{conv.patient}</span>
                        <span className="text-xs text-muted-foreground">{conv.time}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-sm text-muted-foreground truncate">{conv.preview}</p>
                        <UnreadBadge count={conv.unread} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </StaggeredList>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Thread Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AvatarWithInitials 
                  name={conversations[selectedConversation].patient}
                  size="md"
                  showStatus
                  status={conversations[selectedConversation].online ? "online" : "offline"}
                />
                <div>
                  <p className="font-semibold">{conversations[selectedConversation].patient}</p>
                  <p className="text-xs text-muted-foreground">
                    {conversations[selectedConversation].online ? "Online" : `Last seen ${conversations[selectedConversation].time}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon"><Phone className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><Video className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <AnimatePresence>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn("flex", msg.isOwn ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-[70%] p-3 rounded-2xl",
                      msg.isOwn 
                        ? "bg-primary text-primary-foreground rounded-br-sm" 
                        : "bg-muted rounded-bl-sm"
                    )}>
                      <p className="text-sm">{msg.text}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        msg.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        <span className="text-xs">{msg.time}</span>
                        {msg.isOwn && <MessageStatus status={msg.status} />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <AvatarWithInitials name={conversations[selectedConversation].patient} size="sm" />
                  <div className="bg-muted px-4 py-2 rounded-2xl">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input placeholder="Type your message..." className="flex-1" />
                <Button className="bg-primary"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
