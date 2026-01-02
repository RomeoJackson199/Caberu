import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, User, CheckCircle, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface ExistingProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface AccountClaimFlowProps {
  email: string;
  existingProfile: ExistingProfile;
  onBack: () => void;
  onSuccess: () => void;
}

export const AccountClaimFlow = ({ email, existingProfile, onBack, onSuccess }: AccountClaimFlowProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent] = useState(false);
  const { toast } = useToast();

  const handleClaimAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCodeMode) return; // Avoid double-submit when in code mode
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error", 
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: existingProfile.first_name,
            last_name: existingProfile.last_name,
            phone: existingProfile.phone,
            health_data_consent: true,
            health_data_consent_at: new Date().toISOString(),
            claim_existing_profile: existingProfile.id,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ user_id: data.user.id })
          .eq('id', existingProfile.id);

        if (updateError) {
          console.error('Error linking profile:', updateError);
        }

        toast({
          title: "Account Claimed Successfully!",
          description: "Your account has been linked. Please check your email to verify your address.",
        });
        onSuccess();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error Claiming Account",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      // Ensure a session exists for current email (user may have started sign up flow elsewhere)
      // Attempt to generate a claim code for the current user; requires user to be authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        // If not signed in yet, attempt to start a sign up to create user; no password needed for code mode
        const tempPassword = crypto?.randomUUID?.()?.slice(0, 12) || Math.random().toString(36).slice(2, 10);
        const redirectUrl = `${window.location.origin}/`;
        await supabase.auth.signUp({
          email,
          password: tempPassword,
          options: { emailRedirectTo: redirectUrl }
        }).catch(() => undefined);
      }

      // This functionality is not available - just show a message
      toast({ 
        title: "Code method unavailable", 
        description: "Please use the password method instead.", 
        variant: "destructive" 
      });
      setIsCodeMode(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: "Failed to send code", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      // This functionality is not available - redirect to password method
      toast({ 
        title: "Code method unavailable", 
        description: "Please use the password method instead.", 
        variant: "destructive" 
      });
      setIsCodeMode(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: "Failed to claim", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-elegant glass-card border border-border/20">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <User className="h-5 w-5" />
          Claim Your Account
        </CardTitle>
        <CardDescription>
          We found an existing profile for {email}. {isCodeMode ? 'Enter the 6-digit code we email you to link it.' : 'Set a password to claim your account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2">Your Profile Information:</h4>
            <p className="text-sm text-muted-foreground">
              Name: {existingProfile.first_name} {existingProfile.last_name}
            </p>
            {existingProfile.phone && (
              <p className="text-sm text-muted-foreground">
                Phone: {existingProfile.phone}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Email: {email}
            </p>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setIsCodeMode(!isCodeMode)} disabled={isLoading}>
              {isCodeMode ? 'Use password instead' : 'Use 6-digit code instead'}
            </Button>
          </div>

          {!isCodeMode ? (
            <form onSubmit={handleClaimAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}

              <div className="flex space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Claim Account
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleClaimWithCode} className="space-y-4">
              <div className="space-y-2">
                <Label>Enter 6-digit code</Label>
                <div className="flex items-center gap-3">
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button type="button" variant="outline" onClick={handleSendCode} disabled={isLoading}>
                    {codeSent ? 'Resend' : 'Send code'}
                  </Button>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading || code.length !== 6}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Claim with code'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
};