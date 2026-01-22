import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Sparkles, Zap, Clock, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { TwoFactorVerificationDialog } from "@/components/auth/TwoFactorVerificationDialog";
import { logger } from '@/lib/logger';
import { useDespiaNative, useBiometricAuth, useHaptics, useStorageVault } from '@/hooks/useDespia';



const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [show2FADialog, setShow2FADialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [is2FAPending, setIs2FAPending] = useState(false); // FIXED: Use state instead of ref for proper reactivity
  const [isProcessingAuth, setIsProcessingAuth] = useState(false); // Prevent concurrent auth checks
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Native Apple features
  const isNative = useDespiaNative();
  const biometrics = useBiometricAuth();
  const haptics = useHaptics();
  const { value: savedCredentials, save: saveCredentials } = useStorageVault<{ email: string; token: string }>('biometric_credentials');

  // Biometric login handler
  const handleBiometricLogin = async () => {
    if (!biometrics.isAvailable) return;

    haptics.impact();
    const result = await biometrics.authenticate();

    if (result.authenticated && savedCredentials) {
      haptics.success();
      setIsLoading(true);

      try {
        // Use stored refresh token to restore session
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: savedCredentials.token
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Signed in with Face ID",
        });
        navigate("/select-business");
      } catch (error) {
        haptics.error();
        toast({
          title: "Biometric login failed",
          description: "Please sign in with your email and password",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else if (!result.authenticated) {
      haptics.error();
      toast({
        title: "Authentication failed",
        description: result.error || "Please try again",
        variant: "destructive",
      });
    } else if (!savedCredentials) {
      haptics.warning();
      toast({
        title: "No saved credentials",
        description: "Sign in once with email to enable biometric login",
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkAuthState = async () => {
      if (isProcessingAuth) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted || is2FAPending) return;

        if (session) {
          const has2FA = session?.user?.user_metadata?.two_factor_enabled === true;
          if (!has2FA) {
            navigate("/auth-redirect");
          }
        }
      } catch (error) {
        logger.error("Error checking auth state:", error);
      }
    };

    checkAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || is2FAPending || isProcessingAuth) return;

      if (session) {
        const has2FA = session?.user?.user_metadata?.two_factor_enabled === true;
        if (!has2FA) {
          navigate("/auth-redirect");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, is2FAPending, isProcessingAuth]);


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setAuthError(null);

    try {
      // Check rate limit before attempting login
      const rateLimitCheck = await supabase.functions.invoke('check-login-rate-limit', {
        body: {
          email: formData.email,
          action: 'check',
        },
      });

      if (rateLimitCheck.error) {
        throw new Error('Failed to check rate limit');
      }

      if (rateLimitCheck.data && !rateLimitCheck.data.allowed) {
        const minutes = Math.ceil(rateLimitCheck.data.retryAfterSeconds / 60);
        throw new Error(
          rateLimitCheck.data.message ||
          `Too many login attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
        );
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // SECURITY: Enforce email verification before allowing login
      if (!authData.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        toast({
          title: "Email Not Verified",
          description: "Please verify your email address before signing in. Check your inbox for the verification link.",
          variant: "destructive",
          duration: 10000,
        });
        setIsLoading(false);
        return;
      }

      // Check if user has 2FA enabled
      const twoFactorEnabled = authData.user?.user_metadata?.two_factor_enabled === true;


      if (twoFactorEnabled) {
        // User has 2FA enabled - show verification dialog
        // Keep session active during 2FA verification
        setIs2FAPending(true); // FIXED: Use state setter
        setUserEmail(formData.email);
        setShow2FADialog(true);
        setIsLoading(false);
        return;
      }


      // No 2FA - proceed with normal login flow
      await completeLogin();

      // Record successful login to reset rate limits
      try {
        await supabase.functions.invoke('check-login-rate-limit', {
          body: {
            email: formData.email,
            action: 'record_success',
          },
        });
      } catch (resetError) {
        // Don't fail login if rate limit reset fails
        logger.error("Failed to reset rate limit:", resetError);
      }
    } catch (error: unknown) {
      // Log for debugging
      logger.error("Sign in error:", error);

      // Safely get error message
      const errorMessage = error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

      let userFriendlyMessage = "Unable to sign in. Please try again.";
      let isAuthenticationFailure = false;

      if (errorMessage.includes("invalid") || errorMessage.includes("credentials") || errorMessage.includes("password")) {
        userFriendlyMessage = "The email or password you entered is incorrect. Please double-check and try again.";
        isAuthenticationFailure = true;
      } else if (errorMessage.includes("email not confirmed")) {
        userFriendlyMessage = "Your email address hasn't been verified yet. Please check your inbox for the confirmation link.";
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userFriendlyMessage = "We're having trouble connecting. Please check your internet connection and try again.";
      } else if (errorMessage.includes("rate") || errorMessage.includes("limit") || errorMessage.includes("too many")) {
        userFriendlyMessage = error instanceof Error ? error.message : "Too many login attempts. Please wait a moment and try again.";
      }

      // Record failed attempt for authentication failures
      if (isAuthenticationFailure) {
        try {
          await supabase.functions.invoke('check-login-rate-limit', {
            body: {
              email: formData.email,
              action: 'record_failure',
            },
          });
        } catch (recordError) {
          logger.error("Failed to record login attempt:", recordError);
        }
      }

      setAuthError(userFriendlyMessage);
      setIsLoading(false);
    }
  };

  const completeLogin = async () => {
    try {
      // Save credentials for biometric login (if native app)
      if (isNative && biometrics.isAvailable) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.refresh_token && session.user?.email) {
            await saveCredentials({
              email: session.user.email,
              token: session.refresh_token
            }, true); // locked = true requires biometric to access
          }
        } catch (err) {
          // Don't fail login if credential saving fails
          logger.error("Failed to save biometric credentials:", err);
        }
      }

      haptics.success();
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      // Navigate to auth-redirect which handles role-based routing and onboarding checks
      navigate("/auth-redirect");
    } catch (error) {
      logger.error("Error completing login:", error);
    }
  };

  const handle2FASuccess = async () => {
    setIsLoading(true);
    setIs2FAPending(false); // FIXED: Use state setter
    try {
      // Log 2FA login event
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('security_audit_logs').insert({
            user_id: user.id,
            event_type: '2fa_login',
            metadata: { timestamp: new Date().toISOString() }
          });
        }
      } catch (logError) {
        console.error('Failed to log 2FA login:', logError);
      }

      // Complete the login process with the active session
      await completeLogin();

      // Reset rate limits after successful 2FA login
      try {
        await supabase.functions.invoke('check-login-rate-limit', {
          body: {
            email: userEmail || formData.email,
            action: 'record_success',
          },
        });
      } catch (resetError) {
        logger.error("Failed to reset rate limit after 2FA:", resetError);
      }
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Failed to complete sign in after 2FA verification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {


    setIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth-redirect`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast({
        title: "Google sign in failed",
        description: "Unable to sign in with Google. Please try again or use email/password.",
        variant: "destructive",
        duration: 6000,
      });
      setAuthError("Unable to sign in with Google. Please try again or use email/password.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <span className="font-semibold text-lg">Caberu</span>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-5xl font-bold leading-tight mb-4">
                Welcome back to
                <br />
                your workspace
              </h2>
              <p className="text-lg text-white/90">
                Access your dental practice dashboard and keep every patient journey on track.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI-Powered Automation</h3>
                  <p className="text-sm text-white/80">Automate appointment reminders, follow-ups, and patient communications</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Real-Time Scheduling</h3>
                  <p className="text-sm text-white/80">Manage appointments with smart calendar integration</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Instant Insights</h3>
                  <p className="text-sm text-white/80">Track practice performance with powerful analytics</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-white/70">
            Need a new workspace?{" "}
            <Link to="/create-business" className="font-semibold text-white underline-offset-4 hover:underline">
              Create a business
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex lg:hidden items-center justify-center gap-2 mb-6">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Caberu</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Access your workspace to manage your practice
            </p>
          </div>

          <div className="space-y-6">


            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="space-y-4">
                {/* Biometric Sign In (Native iOS only) */}
                {isNative && biometrics.isAvailable && savedCredentials && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBiometricLogin}
                    disabled={isLoading || biometrics.isAuthenticating}
                    className="w-full h-12 border-2 hover:bg-accent bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                  >
                    <Fingerprint className="mr-2 h-5 w-5 text-blue-600" />
                    {biometrics.isAuthenticating ? 'Authenticating...' : 'Sign in with Face ID'}
                  </Button>
                )}

                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-12 border-2 hover:bg-accent"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12"
                      required
                      autoFocus
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-12"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  {authError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive font-medium">{authError}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Sign up link */}
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>

            {/* Terms */}
            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 2FA Verification Dialog */}
      <TwoFactorVerificationDialog
        open={show2FADialog}
        onOpenChange={setShow2FADialog}
        email={userEmail}
        onSuccess={handle2FASuccess}
        mode="login"
      />
    </div>
  );
};

export default Login;
