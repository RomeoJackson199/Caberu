import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, CheckCircle, AlertCircle, User } from "lucide-react";
import { logger } from '@/lib/logger';

export default function Invite() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const token = params.token ?? searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    if (!token) {
      setError("Invalid invitation link");
      setIsLoading(false);
      return;
    }

    try {
      // Use the secure RPC function instead of direct database access
      const { data, error } = await supabase.rpc('validate_invitation_token', {
        invitation_token: token
      });

      if (error || !data || data.length === 0) {
        setError("This invitation link is invalid or has expired");
        setIsLoading(false);
        return;
      }

      const invitationData = data[0];
      setInvitation(invitationData);
      setIsLoading(false);
    } catch (error) {
      logger.error("Error validating invitation:", error);
      setError("Failed to validate invitation");
      setIsLoading(false);
    }
  };

  const handleSetupAccount = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setIsSettingPassword(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: invitation.first_name,
            last_name: invitation.last_name,
            phone: invitation.phone,
            health_data_consent: true,
            health_data_consent_at: new Date().toISOString(),
          },
        },
      });

      if (authError) throw authError;

      // Prefer secure RPC to link profile and mark token used
      let linkError: any = null;
      try {
        const { error: rpcError } = await supabase.rpc('link_profile_to_user', {
          profile_id: invitation.profile_id,
          user_id: authData.user?.id
        });
        if (rpcError) linkError = rpcError;
        const { error: markError } = await supabase.rpc('mark_invitation_used', { invitation_token: token });
        if (markError) logger.error('Error marking invitation used (RPC):', markError);
      } catch (rpcCatch) {
        linkError = rpcCatch;
      }

      if (linkError) {
        // Fallback to direct table updates if RPC not available
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ user_id: authData.user?.id })
          .eq('id', invitation.profile_id);
        if (updateError) logger.error('Error linking profile (fallback):', updateError);

        const { error: tokenError } = await supabase
          .from('invitation_tokens')
          .update({ used: true, used_at: new Date().toISOString() })
          .eq('token', token);
        if (tokenError) logger.error('Error marking invitation as used (fallback):', tokenError);
      }

      toast({
        title: "Account Created Successfully!",
        description: "Please check your email to verify your account, then you can sign in.",
      });

      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error: any) {
      logger.error('Error setting up account:', error);
      toast({
        title: "Error Setting Up Account",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSettingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/')}
              className="w-full"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <User className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Welcome to Caberu</CardTitle>
          <CardDescription>Complete your account setup to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2">Your Account Details:</h4>
              <p className="text-sm text-muted-foreground">
                Name: {invitation.first_name} {invitation.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                Email: {invitation.email}
              </p>
              {invitation.phone && (
                <p className="text-sm text-muted-foreground">
                  Phone: {invitation.phone}
                </p>
              )}
            </div>

            <form onSubmit={handleSetupAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Create Your Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Your Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSettingPassword}
              >
                {isSettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up your account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Set Up Account
                  </>
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}