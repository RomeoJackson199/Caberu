import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Loader2, Bot, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FloatingChatBubbleProps {
  context?: 'general' | 'onboarding';
}

const INITIAL_MESSAGES = {
  general: "👋 Hi! I'm Caberu's AI assistant. Ask me anything about our dental practice management platform!",
  onboarding: "👋 Hi! I'm here to help you set up your business! Ask me anything about the onboarding process or business setup.",
};

const CHAT_TITLES = {
  general: 'Caberu Assistant',
  onboarding: 'Setup Assistant',
};

export function FloatingChatBubble({ context = 'general' }: FloatingChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: INITIAL_MESSAGES[context],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Call Supabase Edge Function for Caberu support
      const { data, error } = await supabase.functions.invoke('caberu-support-chat', {
        body: {
          message: userMessage,
          conversation_history: messages,
          context: context,
        },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message || data.response },
      ]);
    } catch (error: any) {
      console.error('Chat error:', error);
      // Fallback response if the function doesn't exist yet
      const fallbackResponse = getFallbackResponse(userMessage);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallbackResponse },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();

    if (context === 'onboarding') {
      // Onboarding-specific responses
      if (lowerMessage.includes('business name') || lowerMessage.includes('name my business')) {
        return "Choose a name that's memorable and reflects your practice! It should be:\n\n• Easy to spell and pronounce\n• Unique in your area\n• Professional yet friendly\n• Reflects your specialty (optional)\n\nExample: 'Bright Smile Dental' or 'Dr. Smith Family Dentistry'";
      } else if (lowerMessage.includes('tagline') || lowerMessage.includes('slogan')) {
        return "A great tagline captures what makes you special! Keep it:\n\n• Short (5-7 words)\n• Benefit-focused\n• Memorable\n\nExamples:\n• 'Your smile is our passion'\n• 'Gentle care, beautiful smiles'\n• 'Where families feel at home'";
      } else if (lowerMessage.includes('bio') || lowerMessage.includes('description') || lowerMessage.includes('about')) {
        return "Your business bio helps patients understand your practice. Include:\n\n• Your specialty or focus\n• Years of experience\n• What makes you unique\n• Your practice philosophy\n• Services you offer\n\nKeep it friendly, professional, and around 2-3 paragraphs!";
      } else if (lowerMessage.includes('plan') || lowerMessage.includes('subscription') || lowerMessage.includes('pricing')) {
        return "We offer 3 plans:\n\n• **Starter** - Perfect for new practices ($29/mo)\n• **Professional** - Most popular ($79/mo)\n• **Enterprise** - For large practices ($149/mo)\n\nAll plans include a 14-day free trial! You can upgrade or downgrade anytime.";
      } else if (lowerMessage.includes('step') || lowerMessage.includes('next') || lowerMessage.includes('how many')) {
        return "The setup has 3 simple steps:\n\n1. **Sign Up** - Create your account\n2. **Details** - Add your business information\n3. **Subscription** - Choose your plan\n\nYou're doing great! Take your time filling out each step.";
      } else if (lowerMessage.includes('help') || lowerMessage.includes('stuck') || lowerMessage.includes('confused')) {
        return "No worries, I'm here to help! You can:\n\n• Ask me specific questions about any field\n• Skip optional fields and come back later\n• Use the AI Guide on the right for suggestions\n• Contact support anytime\n\nWhat specific part can I help you with?";
      } else {
        return "I'm here to help you create your business! You can ask me about:\n\n• Choosing a business name or tagline\n• Writing your business bio\n• Understanding the different plans\n• Any step in the setup process\n\nWhat would you like to know?";
      }
    } else {
      // General support responses
      if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
        return "Caberu offers smart appointment scheduling with AI-powered triage. You can book appointments, manage your calendar, and send automated reminders to reduce no-shows. Would you like to know more about any specific feature?";
      } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('plan')) {
        return "Caberu offers flexible pricing plans for practices of all sizes. Visit our Pricing page to see detailed plan comparisons and find the best fit for your practice!";
      } else if (lowerMessage.includes('feature') || lowerMessage.includes('what can')) {
        return "Caberu is a complete dental practice management system with:\n\n• Smart Scheduling with AI triage\n• Patient Records & Treatment History\n• Billing & Payment Processing\n• Inventory Management\n• Analytics & Reporting\n• Automated Reminders\n• Multi-Provider Support\n• GDPR Compliant Security\n\nWhat would you like to know more about?";
      } else if (lowerMessage.includes('ai') || lowerMessage.includes('chatbot')) {
        return "Yes! Caberu includes an AI Assistant that helps with patient triage, answers common questions, and guides patients through booking appointments. It's available 24/7 and can handle multiple languages!";
      } else if (lowerMessage.includes('hipaa') || lowerMessage.includes('security') || lowerMessage.includes('secure')) {
        return "Absolutely! Caberu is HIPAA compliant with enterprise-grade security and encryption. Your patient data is protected with the highest security standards.";
      } else if (lowerMessage.includes('start') || lowerMessage.includes('get started') || lowerMessage.includes('sign up')) {
        return "Getting started with Caberu is easy! Click 'Sign Up' to create your account, and you'll be guided through our onboarding process. We'll help you set up your practice profile, add services, and configure your settings. Need help? Our support team is here for you!";
      } else {
        return "Thanks for your question! Caberu is an AI-powered dental practice management platform that helps you manage appointments, patient records, billing, inventory, and more—all in one place. What specific aspect would you like to know about?";
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Bubble Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-110"
            >
              <MessageCircle className="h-8 w-8" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)]"
          >
            <Card className="shadow-2xl border-2 border-primary/20">
              {/* Header */}
              <CardHeader className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{CHAT_TITLES[context]}</CardTitle>
                      <p className="text-xs text-white/80">{context === 'onboarding' ? 'Need help setting up?' : 'Ask me anything!'}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="h-[400px] p-4 bg-gradient-to-b from-background to-muted/20" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div
                        className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''
                          }`}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {msg.role === 'assistant' ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary/80 to-secondary flex items-center justify-center shadow-sm">
                              <UserIcon className="w-4 h-4 text-secondary-foreground" />
                            </div>
                          )}
                        </div>
                        {/* Message Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-2 shadow-md ${msg.role === 'user'
                              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                              : 'bg-card border border-border'
                            }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-start gap-2 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="rounded-2xl px-4 py-2 bg-card border border-border shadow-md">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <CardContent className="p-3 border-t bg-card/50 backdrop-blur-sm">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your question..."
                    disabled={isLoading}
                    className="flex-1 bg-background/50 border-input/50 focus:border-primary transition-colors"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="h-10 w-10 rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
