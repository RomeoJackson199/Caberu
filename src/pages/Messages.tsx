import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, LogIn } from 'lucide-react';
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
      <div className="max-w-screen-2xl mx-auto">
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
