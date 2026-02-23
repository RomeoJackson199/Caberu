import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { Loader2, Link2, CheckCircle2, Phone, Mail, Chrome, Apple } from "lucide-react";
import { motion } from "framer-motion";

interface LinkedIdentity {
  provider: string;
  identity_id: string;
  created_at: string | undefined;
}

const providerConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  email: { label: "Email & Password", icon: Mail, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
  phone: { label: "Phone (SMS)", icon: Phone, color: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
  google: { label: "Google", icon: Chrome, color: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400" },
  apple: { label: "Apple", icon: Apple, color: "text-zinc-700 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200" },
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

              {(provider === "google" || provider === "apple") && (
                <div className="pointer-events-auto">
                  {linked ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (identity) {
                          handleUnlink(provider, identity.identity_id);
                        }
                      }}
                      disabled={isProcessing || identities.length <= 1}
                      className="text-destructive hover:text-destructive"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlink"}
                    </Button>
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
                  )}
                </div>
              )}

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
