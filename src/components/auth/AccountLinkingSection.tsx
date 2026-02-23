import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { Loader2, Link2, CheckCircle2, Phone, Mail } from "lucide-react";
import { motion } from "framer-motion";

interface LinkedIdentity {
  provider: string;
  identity_id: string;
  created_at: string | undefined;
}

const GoogleLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.65Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.94-2.92l-3.88-3A7.18 7.18 0 0 1 12 19.35a7.22 7.22 0 0 1-6.78-4.98H1.22v3.09A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.22 14.37A7.2 7.2 0 0 1 4.84 12c0-.82.14-1.61.38-2.37V6.54H1.22A12 12 0 0 0 0 12c0 1.93.46 3.75 1.22 5.46l4-3.09Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.76c1.76 0 3.34.6 4.58 1.77l3.43-3.43C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.22 6.54l4 3.09A7.22 7.22 0 0 1 12 4.76Z"
    />
  </svg>
);

const AppleLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="currentColor"
      d="M16.37 12.25c0-2.16 1.76-3.19 1.83-3.23-1-1.45-2.55-1.66-3.1-1.68-1.31-.13-2.57.78-3.23.78-.67 0-1.67-.76-2.74-.74-1.4.02-2.72.83-3.44 2.09-1.48 2.55-.37 6.3 1.04 8.34.7 1 1.52 2.12 2.6 2.08 1.06-.04 1.46-.67 2.75-.67 1.27 0 1.65.67 2.76.64 1.14-.02 1.86-1.02 2.55-2.03.81-1.14 1.13-2.27 1.14-2.33-.02 0-2.16-.83-2.16-3.25Zm-2.16-6.24c.57-.69.97-1.64.86-2.6-.82.03-1.84.56-2.43 1.23-.53.6-1 1.57-.88 2.49.93.07 1.86-.47 2.45-1.12Z"
    />
  </svg>
);

const providerConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  email: { label: "Email & Password", icon: Mail, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
  phone: { label: "Phone (SMS)", icon: Phone, color: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
  google: { label: "Google", icon: GoogleLogo, color: "bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700" },
  apple: { label: "Apple", icon: AppleLogo, color: "text-zinc-900 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200" },
};

export function AccountLinkingSection() {
  const { toast } = useToast();
  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  useEffect(() => {
    loadIdentities();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const linkedProvider = url.searchParams.get("linked");
    const authError = url.searchParams.get("error_description") || url.searchParams.get("error");

    if (linkedProvider) {
      toast({
        title: "Account linked",
        description: `${providerConfig[linkedProvider]?.label || linkedProvider} is now connected to your account.`,
      });
      setLinkingProvider(null);
      loadIdentities();
      url.searchParams.delete("linked");
      window.history.replaceState({}, "", url.toString());
    }

    if (authError) {
      toast({
        title: "Linking failed",
        description: decodeURIComponent(authError),
        variant: "destructive",
      });
      setLinkingProvider(null);
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      window.history.replaceState({}, "", url.toString());
    }
  }, [toast]);

  const loadIdentities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.identities) {
        setIdentities(
          user.identities.map((id) => ({
            provider: id.provider,
            identity_id: id.id,
            created_at: id.created_at,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load identities:", error);
    } finally {
      setLoading(false);
    }
  };

  const isLinked = (provider: string) =>
    identities.some((id) => id.provider === provider);

  const handleLinkProvider = async (provider: "google" | "apple") => {
    setLinkingProvider(provider);
    try {
      const redirectUrl = new URL(window.location.href);
      redirectUrl.searchParams.set("linked", provider);

      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: redirectUrl.toString(),
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : `Failed to link ${providerConfig[provider]?.label || provider}`;
      toast({
        title: "Linking failed",
        description: msg,
        variant: "destructive",
      });
      setLinkingProvider(null);
    }
  };

  const handleUnlink = async (provider: string, identityId: string) => {
    if (identities.length <= 1) {
      toast({
        title: "Cannot unlink",
        description: "You must keep at least one sign-in method linked.",
        variant: "destructive",
      });
      return;
    }

    setLinkingProvider(provider);
    try {
      const { error } = await supabase.auth.unlinkIdentity({
        provider,
        id: identityId,
      } as never);
      if (error) throw error;

      setIdentities((prev) => prev.filter((id) => id.identity_id !== identityId));
      toast({
        title: "Unlinked",
        description: `${providerConfig[provider]?.label || provider} has been unlinked from your account.`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to unlink";
      toast({
        title: "Unlink failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleManualSetup = (provider: "email" | "phone") => {
    toast({
      title: `${providerConfig[provider].label} setup`,
      description:
        provider === "email"
          ? "Add an email/password sign-in method from Security by setting a password for your account."
          : "Add a phone sign-in method by saving and verifying your phone number in Profile & Personal Info.",
    });
  };

  if (loading) {
    return (
      <GlassCard variant="interactive">
        <GlassCardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </GlassCardContent>
      </GlassCard>
    );
  }

  const availableProviders = ["email", "phone", "google", "apple"];

  return (
    <GlassCard variant="interactive">
      <GlassCardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <GlassCardTitle>Linked Accounts</GlassCardTitle>
            <GlassCardDescription>
              Manage sign-in methods connected to your account
            </GlassCardDescription>
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent className="space-y-3">
        {availableProviders.map((provider) => {
          const config = providerConfig[provider];
          const linked = isLinked(provider);
          const identity = identities.find((id) => id.provider === provider);
          const Icon = config?.icon || Mail;
          const isProcessing = linkingProvider === provider;
          const canUnlink = linked && identities.length > 1;

          return (
            <motion.div
              key={provider}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-4 border rounded-xl bg-white/30 dark:bg-black/10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config?.color || ""}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{config?.label || provider}</p>
                  {linked && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Connected
                    </p>
                  )}
                </div>
              </div>

              <div className="pointer-events-auto min-w-[70px] flex justify-end">
                {(provider === "google" || provider === "apple") &&
                  (linked ? (
                    canUnlink ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (identity) {
                            handleUnlink(provider, identity.identity_id);
                          }
                        }}
                        disabled={isProcessing}
                        className="text-destructive hover:text-destructive"
                      >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlink"}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Linked
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleLinkProvider(provider);
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
                    </Button>
                  ))}

                {(provider === "email" || provider === "phone") && !linked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleManualSetup(provider);
                    }}
                  >
                    Setup
                  </Button>
                )}
              </div>

              {(provider === "email" || provider === "phone") && linked && (
                <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted">
                  Primary
                </span>
              )}
            </motion.div>
          );
        })}
      </GlassCardContent>
    </GlassCard>
  );
}
