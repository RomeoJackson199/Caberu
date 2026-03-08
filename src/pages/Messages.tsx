import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, LogIn } from 'lucide-react';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Skeleton } from '@/components/ui/skeleton';

export default function Messages() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    name: string;
    businessId: string;
    profilePictureUrl?: string | null;
  } | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
      <div className="h-[calc(100vh-4rem)] overflow-hidden bg-gradient-subtle">
        <Card className="h-full overflow-hidden shadow-2xl border border-border/60 backdrop-blur rounded-none sm:rounded-lg">
          <div className="grid grid-cols-12 h-full overflow-hidden">
            {/* Conversation list skeleton */}
            <div className="col-span-4 h-full border-r border-border/80 p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[60%]" />
                    <Skeleton className="h-3 w-[80%]" />
                  </div>
                </div>
              ))}
            </div>
            {/* Chat area skeleton */}
            <div className="col-span-8 h-full flex flex-col">
              <div className="p-4 border-b flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="flex-1 p-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-[60%]' : 'w-[40%]'} rounded-xl`} />
                  </div>
                ))}
              </div>
              <div className="p-4 border-t">
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-heading font-bold mb-2">{t.signInToMessage || "Sign in to Message"}</h2>
          <p className="text-muted-foreground mb-6">
            {t.needSignedInToMessage || "You need to be signed in to send and receive messages"}
          </p>
          <Button onClick={() => navigate('/login')} size="lg">
            <LogIn className="h-4 w-4 mr-2" />
            {t.signIn}
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
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-gradient-subtle">
      <Card className="h-full overflow-hidden shadow-2xl border border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-none sm:rounded-lg">
        <div className="grid grid-cols-12 h-full overflow-hidden">
          <div className="col-span-4 h-full overflow-hidden border-r border-border/80 bg-gradient-to-b from-background via-background to-muted/20">
            <ConversationList
              currentUserId={currentUserId}
              onSelectRecipient={setSelectedRecipient}
            />
          </div>
          <div className="col-span-8 h-full overflow-hidden bg-background/80">
            {selectedRecipient ? (
              <ChatWindow
                currentUserId={currentUserId}
                recipient={selectedRecipient}
                onBack={null}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center max-w-md px-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 shadow-md">
                    <MessageSquare className="h-10 w-10 text-primary" />
                  </div>
                  <p className="font-heading font-semibold text-foreground mb-1">{t.selectConversation || "Select a conversation"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
