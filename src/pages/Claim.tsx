import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import { emitAnalyticsEvent } from "@/lib/analyticsEvents";

interface ProfileRow {
  id: string;
  email: string;
  user_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const first = local[0] ?? "";
  return `${first}${"\u2022".repeat(Math.max(0, local.length - 1))}@${domain}`;
};

const Claim = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "password" | "neutral" | "error">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [qualifyingProfile, setQualifyingProfile] = useState<ProfileRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const isProduction = useMemo(() => (import.meta as any).env?.MODE === "production" || (import.meta as any).env?.PROD === true, []);
  const isNonProduction = !isProduction;

  useEffect(() => {
    // Production: enable claim flow
  }, [isProduction]);

  // Prefill email from query parameter if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location.search]);

  useEffect(() => {
    // Telemetry: entering claim flow and whether bypass is enabled
    emitAnalyticsEvent('CLAIM_FLOW_ENTERED', 'unknown', { bypassEnabled: isNonProduction });
    if (isNonProduction) {
      emitAnalyticsEvent('CLAIM_DEV_BYPASS_ENABLED', 'unknown', {});
    }
  }, [isNonProduction]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 900));
    // Production: proceed to server-side check

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email.", variant: "destructive" });
      await minDelayPromise;
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setQualifyingProfile(null);
    try {
      const { data: funcData, error: funcErr } = await supabase.functions.invoke('claim-profile', {
        body: { email: normalizedEmail }
      });

      let proceedPassword = false;
      if (!funcErr && funcData) {
        const body = funcData as any;
        proceedPassword = body?.claimable === true;
      }

      if (!proceedPassword) {
        // Fallback: direct DB check under RLS; safe query that reveals minimal info
        const { data: rows, error: dbErr } = await supabase
          .from('profiles')
          .select('id, email, user_id, first_name, last_name')
          .ilike('email', normalizedEmail);

        if (!dbErr && Array.isArray(rows)) {
          const unlinked = rows.filter(r => r.user_id === null);
          if (unlinked.length === 1) {
            setQualifyingProfile(unlinked[0] as ProfileRow);
            proceedPassword = true;
          }
        }
      }

      // Always allow proceeding to password creation. The backend will
      // validate claimability and respond generically if not allowed.
      setStep("password");
      await minDelayPromise;
      return;
    } catch (_err) {
      setErrorMessage("We couldn't verify your email right now. Please try again.");
      setStep("error");
      await minDelayPromise;
      return;
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Password submit always uses function; profile is resolved server-side

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please re-enter your password.", variant: "destructive" });
      return;
    }

    if (password.length < 12) {
      toast({ title: "Password too short", description: "Use at least 12 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Call production claim function to create user and link profile
      const response = await supabase.functions.invoke('claim-profile', {
        body: { email: email.trim().toLowerCase(), password }
      });

      const { data: claimData, error: claimError } = response;

      // Check for error in response data (edge function returns error in body)
      const errorCode = claimData?.error || claimError?.message;
      
      if (errorCode === 'ALREADY_CLAIMED') {
        setErrorMessage("This profile has already been claimed. Please sign in with your existing account or reset your password.");
        setStep("error");
        return;
      }
      
      if (errorCode === 'USER_EXISTS') {
        setErrorMessage("An account already exists for this email. Please sign in or reset your password.");
        setStep("error");
        return;
      }
      
      if (errorCode === 'Not allowed' || claimError) {
        // Show neutral if the backend rejected; don't leak details
        setStep("neutral");
        return;
      }

      if (!claimData?.ok) {
        const message = claimData?.error || "Unable to complete account claim.";
        setErrorMessage(message);
        setStep("error");
        return;
      }

      // Attempt sign-in immediately with the new password (email marked confirmed server-side)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (signInError) {
        setErrorMessage("We couldn't sign you in. Please try again.");
        setStep("error");
        return;
      }

      // Telemetry after sign-in
      await emitAnalyticsEvent('CLAIM_PASSWORD_CREATED', 'unknown', {});

      // Navigate to dashboard; ProfileCompletionDialog will handle missing fields
      navigate("/dashboard", { replace: true });
    } catch (_err) {
      setErrorMessage("Unable to complete account claim. Please try again.");
      setStep("error");
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 mesh-bg">
      <div className="w-full max-w-md space-y-4">
        {isNonProduction && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
            <ShieldAlert className="h-4 w-4" />
            <span>Dev environment — account claim bypass enabled</span>
          </div>
        )}

        {step === "email" && (
          <Card className="shadow-elegant glass-card border border-border/20">
            <CardHeader>
              <CardTitle>Claim your account</CardTitle>
              <CardDescription>Enter your email. If we find your profile, we’ll help you sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue"}
                </Button>
                <div className="text-center text-sm">
                  <a className="text-dental-primary underline" href="/">Back to standard login</a>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "password" && (
          <Card className="shadow-elegant glass-card border border-border/20">
            <CardHeader>
              <CardTitle>Secure your account</CardTitle>
              <CardDescription>Create a strong password to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">{maskEmail(email)}</p>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      minLength={12}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Use at least 12 characters. Avoid common phrases or personal info.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-red-500">Passwords don’t match</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading || !password || password !== confirmPassword}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save and continue"}
                </Button>
                <div className="text-center text-sm">
                  <a className="text-dental-primary underline" href="/">Back to standard login</a>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "neutral" && (
          <Card className="shadow-elegant glass-card border border-border/20">
            <CardHeader>
              <CardTitle>Account Claim</CardTitle>
              <CardDescription>If an account exists for this email, we’ll help you sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="w-full" onClick={() => navigate("/", { replace: true })}>Back to login</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "error" && (
          <Card className="shadow-elegant glass-card border border-border/20">
            <CardHeader>
              <CardTitle>We’re having trouble</CardTitle>
              <CardDescription>{errorMessage || "Please try again or contact the clinic for assistance."}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="w-full" onClick={() => navigate("/", { replace: true })}>Back to login</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Claim;