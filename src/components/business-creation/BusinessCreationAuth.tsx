import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { PhoneOTPAuth } from '@/components/auth/PhoneOTPAuth';

interface BusinessCreationAuthProps {
  onComplete: () => void;
}

export function BusinessCreationAuth({ onComplete }: BusinessCreationAuthProps) {
  const [checking, setChecking] = useState(true);

  // Check if user is already logged in, and listen for session changes.
  // This handles the race condition where AuthCallbackHandler is still
  // exchanging the PKCE code (from email verification) when this component
  // mounts — the onAuthStateChange listener catches the session once it's ready.
  useEffect(() => {
    let completed = false;

    const handleSession = () => {
      if (!completed) {
        completed = true;
        onComplete();
      }
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handleSession();
      } else {
        setChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        handleSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [onComplete]);

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Create Your Account</h2>
        <p className="text-muted-foreground mt-2">
          Get started by verifying your phone number
        </p>
      </div>

      <PhoneOTPAuth
        signupMetadata={{ role_type: 'owner' }}
        onSuccess={onComplete}
      />
    </div>
  );
}
