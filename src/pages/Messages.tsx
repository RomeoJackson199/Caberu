import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, LogIn, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    name: string;
    businessId: string;
  } | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Sign in to Message</h2>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to send and receive messages
          </p>
          <Button onClick={() => navigate('/login')} size="lg">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        {!selectedRecipient ? (
          <div className="p-4">
            <div className="mb-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 px-4 py-4 rounded-xl -mx-4">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">
                Communication Hub
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Chat with your dentist or patients</p>
            </div>
            <ConversationList
              currentUserId={currentUserId}
              onSelectRecipient={setSelectedRecipient}
            />
          </div>
        ) : (
          <ChatWindow
            currentUserId={currentUserId}
            recipient={selectedRecipient}
            onBack={() => setSelectedRecipient(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border-none shadow-lg">
          <div className="px-6 py-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-2">
                Communication Hub
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                A focused space for dentists and patients to keep treatment details aligned, share updates, and get quick answers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                <HeartPulse className="h-4 w-4" />
                Patient friendly
              </Badge>
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                <ShieldCheck className="h-4 w-4" />
                Dentist ready
              </Badge>
              <Badge variant="outline" className="gap-1 px-3 py-1">
                <Sparkles className="h-4 w-4" />
                Real-time updates
              </Badge>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          {[{
            title: 'Patients stay on top of care',
            description: 'Message your dentist about soreness, insurance questions, or appointment prep without picking up the phone.',
            icon: HeartPulse,
            accent: 'from-emerald-500/10 via-emerald-500/5 to-transparent'
          }, {
            title: 'Dentists keep patients aligned',
            description: 'Share post-visit reminders, respond to urgent concerns, and keep treatment notes in one place.',
            icon: ShieldCheck,
            accent: 'from-blue-500/10 via-blue-500/5 to-transparent'
          }, {
            title: 'Full-width workspace',
            description: 'The conversation panel now stretches across the page so you can focus on the details that matter.',
            icon: Sparkles,
            accent: 'from-purple-500/10 via-purple-500/5 to-transparent'
          }].map((highlight) => (
            <Card key={highlight.title} className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="p-4 flex gap-3">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${highlight.accent} flex items-center justify-center border border-border/60`}>
                  <highlight.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{highlight.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{highlight.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden shadow-2xl border border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="grid grid-cols-12 h-[calc(100vh-14rem)]">
            <div className="col-span-4 border-r border-border/80 bg-gradient-to-b from-background via-background to-muted/20">
              <ConversationList
                currentUserId={currentUserId}
                onSelectRecipient={setSelectedRecipient}
              />
            </div>
            <div className="col-span-8 bg-background/80">
              {selectedRecipient ? (
                <ChatWindow
                  currentUserId={currentUserId}
                  recipient={selectedRecipient}
                  onBack={null}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center max-w-md px-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 mb-4 shadow-md">
                      <MessageSquare className="h-10 w-10 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground mb-1">Select a conversation</p>
                    <p className="text-sm text-muted-foreground">
                      The messaging workspace now fills the page so patients and dentists can concentrate on one thread at a time.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
