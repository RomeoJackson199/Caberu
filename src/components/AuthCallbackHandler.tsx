import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';

/**
 * Processes Supabase auth callback parameters then cleans the URL.
 * - Handles PKCE code exchange (?code=...)
 * - Handles implicit hash fragments (#access_token=...)
 * - Links Google OAuth users to existing imported profiles
 * - Removes query/hash from the URL after processing
 */
export const AuthCallbackHandler = () => {
  const { toast } = useToast();

  useEffect(() => {
    const processAuthCallback = async () => {
      const currentUrl = new URL(window.location.href);
      const { search, hash } = currentUrl;

      const hasPkceCode = currentUrl.searchParams.has("code");
      const hasImplicitHash =
        hash.includes("access_token") ||
        hash.includes("refresh_token") ||
        hash.includes("provider_token") ||
        hash.includes("error");

      const cleanupUrl = (removeAllParams: boolean) => {
        const cleaned = removeAllParams
          ? `${currentUrl.origin}${currentUrl.pathname}`
          : `${currentUrl.origin}${currentUrl.pathname}${currentUrl.search}`;
        window.history.replaceState({}, document.title, cleaned);
      };

      try {
        let authProcessed = false;

        if (hasPkceCode) {
          // PKCE callback: exchange code for a session
          await supabase.auth.exchangeCodeForSession(window.location.href);
          authProcessed = true;
          // Remove the code and other params from the URL entirely
          cleanupUrl(true);
        }

        if (hasImplicitHash) {
          // Parse tokens from the hash and set the session explicitly (robust across environments)
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const access_token = params.get("access_token") || undefined;
          const refresh_token = params.get("refresh_token") || undefined;

          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            authProcessed = true;
          } else {
            // Fallback: trigger internal detection if available
            await supabase.auth.getSession();
          }

          // Remove the hash portion from the URL (keep any non-auth search params)
          cleanupUrl(false);
        }

        // If we processed authentication, check for profile linking and business context
        if (authProcessed) {
          setTimeout(async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session?.user?.email) {
                const email = session.user.email;
                
                // Check if this user has an imported profile to claim
                const { data: existingProfile } = await supabase
                  .from('secure_profiles_view')
                  .select('*')
                  .eq('email', email)
                  .is('user_id', null)
                  .maybeSingle();

                if (existingProfile) {
                  // Link the auth user to the existing imported profile
                  const { error: linkError } = await supabase
                    .from('profiles')
                    .update({ 
                      user_id: session.user.id,
                      profile_completion_status: 'incomplete'
                    })
                    .eq('id', existingProfile.id);

                  if (!linkError) {
                    // Remove any auto-created profile to avoid duplicates
                    await supabase
                      .from('profiles')
                      .delete()
                      .eq('user_id', session.user.id)
                      .neq('id', existingProfile.id);

                    toast({
                      title: "Profile Linked",
                      description: "Your imported clinic profile has been linked to your account.",
                    });
                  }
                }
              }

              // Auto-set business context from user's profile if not already set
              const selectedBusinessId = localStorage.getItem('selected_business_id');
              if (selectedBusinessId) {
                // Apply pre-login clinic selection if present
                await supabase.functions.invoke('set-current-business', {
                  body: { businessId: selectedBusinessId },
                }).catch(console.warn);
                localStorage.removeItem('selected_business_id');
              } else {
                // No pre-selected business, check if user's profile has a business_id
                const { data: userProfile } = await supabase
                  .from('secure_profiles_view')
                  .select('business_id')
                  .eq('user_id', session?.user?.id)
                  .maybeSingle();

                if (userProfile?.business_id) {
                  logger.info('Auto-setting business context from profile:', userProfile.business_id);
                  await supabase.functions.invoke('set-current-business', {
                    body: { businessId: userProfile.business_id },
                  }).catch(console.warn);
                }
              }

            } catch (error) {
              console.error("Profile linking error:", error);
            }
          }, 1000); // Small delay to ensure session is fully established
        }
      } catch (error) {
        console.error("Auth callback processing failed:", error);
        // Attempt to clean up even on failure to avoid exposing tokens in the URL
        if (hasImplicitHash || hasPkceCode) {
          cleanupUrl(hasPkceCode);
        }
      }
    };

    processAuthCallback();
  }, [toast]);

  return null;
};

export default AuthCallbackHandler;
