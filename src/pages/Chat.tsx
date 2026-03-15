import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InteractiveDentalChat } from '@/components/chat/InteractiveDentalChat';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { useBusinessTemplate } from '@/hooks/useBusinessTemplate';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function Chat() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { hasFeature, loading } = useBusinessTemplate();
  const hasAIChat = !loading && hasFeature('aiChat');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      setUser(authUser);

      const { data: profileData, error } = await supabase
        .from('secure_profiles_view')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (error) {
        logger.error('Error loading profile:', error);
        return;
      }

      if (profileData) {
        setProfile(profileData);
      } else {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: authUser.id,
            email: authUser.email || '',
            first_name: '',
            last_name: '',
            preferred_language: 'en'
          })
          .select()
          .single();

        if (createError) {
          logger.error('Error creating profile:', createError);
          return;
        }

        setProfile(newProfile);
      }
    } catch (error) {
      logger.error('Error loading user profile:', error);
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dental-primary"></div>
      </div>
    );
  }

  if (!hasAIChat) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">AI Chat Not Available</h2>
            <p className="text-muted-foreground">
              AI chat is not enabled for this business type. Please contact your service provider for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-background">
      <InteractiveDentalChat user={user} />
    </div>
  );
}
