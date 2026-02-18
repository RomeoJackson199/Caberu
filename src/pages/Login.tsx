import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Loader2, Shield, Sparkles, Zap, Clock, Fingerprint, User, Phone, Mail, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { TwoFactorVerificationDialog } from "@/components/auth/TwoFactorVerificationDialog";
import { logger } from '@/lib/logger';
import { useDespiaNative, useBiometricAuth, useHaptics, useStorageVault } from '@/hooks/useDespia';

const REMEMBERED_EMAIL_KEY = "caberu_remembered_email";
const REMEMBERED_NAME_KEY = "caberu_remembered_name";

const PREFILLED_BUSINESS_KEY = "caberu_prefilled_business";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // If coming from a business profile page (?business=slug), store it
  // so the select-business page can auto-select it after login
  useEffect(() => {
    const businessSlug = searchParams.get("business");
    if (businessSlug) {
      localStorage.setItem(PREFILLED_BUSINESS_KEY, businessSlug.toLowerCase());
    }
  }, [searchParams]);

  const [show2FADialog, setShow2FADialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [is2FAPending, setIs2FAPending] = useState(false); // FIXED: Use state instead of ref for proper reactivity
  const [isProcessingAuth, setIsProcessingAuth] = useState(false); // Prevent concurrent auth checks

  // Returning user detection
  const [rememberedEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || "");
  const [rememberedName] = useState(() => localStorage.getItem(REMEMBERED_NAME_KEY) || "");
  const [isReturningUser, setIsReturningUser] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY));

  const [formData, setFormData] = useState({
    email: localStorage.getItem(REMEMBERED_EMAIL_KEY) || "",
    password: "",
  });
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

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
      // SECURITY: Check rate limit before attempting login
      const rateLimitCheck = await supabase.functions.invoke('check-login-rate-limit', {
        body: { email: formData.email }
      });

      if (rateLimitCheck.error || !rateLimitCheck.data?.allowed) {
        const retryAfter = rateLimitCheck.data?.retry_after || 900;
        const minutes = Math.ceil(retryAfter / 60);
        setAuthError(`Too many login attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        setIsLoading(false);
        return;
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
    } catch (error: unknown) {
      // Log for debugging
      logger.error("Sign in error:", error);

      // Safely get error message
      const errorMessage = error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

      let userFriendlyMessage = "Unable to sign in. Please try again.";

      if (errorMessage.includes("invalid") || errorMessage.includes("credentials") || errorMessage.includes("password")) {
        userFriendlyMessage = "The email or password you entered is incorrect. Please double-check and try again.";
      } else if (errorMessage.includes("email not confirmed")) {
        userFriendlyMessage = "Your email address hasn't been verified yet. Please check your inbox for the confirmation link.";
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userFriendlyMessage = "We're having trouble connecting. Please check your internet connection and try again.";
      } else if (errorMessage.includes("rate") || errorMessage.includes("limit")) {
        userFriendlyMessage = "Too many login attempts. Please wait a moment and try again.";
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

      // Remember user email for returning user experience
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, user.email);
          const displayName = user.user_metadata?.first_name || user.email.split("@")[0];
          localStorage.setItem(REMEMBERED_NAME_KEY, displayName);
        }
      } catch (err) {
        // Non-critical - don't fail login
        logger.error("Failed to save remembered user:", err);
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

  // Phone number formatting
  const formatPhoneNumber = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned && !cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  };

  const sendPhoneCode = async () => {
    if (resendCooldown > 0) return;
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone || formattedPhone.length < 8) {
      toast({ title: "Invalid Phone Number", description: "Enter a valid phone number with country code", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: { phoneNumber: formattedPhone, type: 'login' }
      });
      if (error) throw error;
      setCodeSent(true);
      setMaskedPhone(data.maskedPhone || formattedPhone);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
      }, 1000);
      toast({ title: "Code Sent", description: "Check your phone for the verification code" });
    } catch (error: unknown) {
      logger.error('Error sending SMS code:', error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to send code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (verificationCode.length < 4) {
      toast({ title: "Invalid Code", description: "Please enter the code from your SMS", variant: "destructive" });
      return;
    }
    const formattedPhone = formatPhoneNumber(phoneNumber);
    setIsLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: { phoneNumber: formattedPhone, code: verificationCode }
      });
      if (error) throw error;
      if (data?.verified) {
        // Try to sign in with phone credentials
        const { error: signInError } = await supabase.auth.signInWithPassword({
          phone: formattedPhone,
          password: formattedPhone,
        });
        if (signInError) {
          // Fallback: try signup which creates an account and signs in
          const { error: signUpError } = await supabase.auth.signUp({
            phone: formattedPhone,
            password: formattedPhone,
            options: { data: { role_type: 'patient', phone: formattedPhone } },
          });
          if (signUpError) {
            setAuthError("Phone verified but no account found for this number. Please sign in with email or create an account first.");
            return;
          }
        }
        await completeLogin();
      } else {
        toast({ title: "Invalid Code", description: data?.error || "The verification code is incorrect", variant: "destructive" });
      }
    } catch (error: unknown) {
      logger.error('Error verifying code:', error);
      setAuthError(error instanceof Error ? error.message : "Failed to verify code");
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

            {isReturningUser ? (
              <>
                {/* Returning user avatar */}
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back{rememberedName ? `, ${rememberedName}` : ""}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {rememberedEmail}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
                <p className="text-sm text-muted-foreground">
                  Access your workspace to manage your practice
                </p>
              </>
            )}
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
                    className="w-full h-12 border-2 hover:bg-accent"
                  >
                    <Fingerprint className="mr-2 h-5 w-5 text-primary" />
                    {biometrics.isAuthenticating ? 'Authenticating...' : 'Sign in with Face ID'}
                  </Button>
                )}

                {/* Default: Phone-first login */}
                {!loginMethod && (
                  <>
                    {/* Phone input / verification */}
                    {!codeSent ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="login-phone">Phone number</Label>
                          <Input
                            id="login-phone"
                            type="tel"
                            placeholder="+32467881965"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                            className="h-12"
                            autoFocus={!isReturningUser}
                          />
                        </div>
                        <Button
                          onClick={sendPhoneCode}
                          disabled={isLoading || !phoneNumber || phoneNumber.length < 8}
                          className="w-full h-12 text-base font-semibold"
                        >
                          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Code"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">SMS sent to</p>
                            <p className="text-sm text-muted-foreground">{maskedPhone}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-code">Verification Code</Label>
                          <Input
                            id="login-code"
                            placeholder="Enter code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            maxLength={8}
                            className="h-12 text-center text-2xl tracking-widest"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={sendPhoneCode}
                            disabled={isLoading || resendCooldown > 0}
                            className="flex-1"
                          >
                            {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                          </Button>
                          <Button
                            onClick={verifyPhoneCode}
                            disabled={isLoading || verificationCode.length < 4}
                            className="flex-1"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Sign In"}
                          </Button>
                        </div>
                      </>
                    )}

                    {authError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive font-medium">{authError}</p>
                      </div>
                    )}

                    {/* OTHER OPTIONS divider */}
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-3 text-muted-foreground font-medium">other options</span>
                      </div>
                    </div>

                    {/* Google */}
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

                    {/* Email option */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLoginMethod('email')}
                      disabled={isLoading}
                      className="w-full h-12 border-2 hover:bg-accent justify-between"
                    >
                      <span className="flex items-center">
                        <Mail className="mr-2 h-5 w-5" />
                        Continue with Email
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                )}

                {/* Email/Password Form */}
                {loginMethod === 'email' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setLoginMethod(null); setAuthError(null); }}
                      className="mb-2"
                    >
                      ← Back
                    </Button>

                    <form onSubmit={handleSignIn} className="space-y-4" role="form" aria-label="Sign in form">
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

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Password</span>
                          <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
                        </div>
                        <FormField
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="h-12"
                          required
                          autoComplete="current-password"
                          showPasswordToggle={true}
                          showCharacterCount={false}
                          error={authError && formData.password ? "Please check your password and try again" : undefined}
                        />
                      </div>

                      {authError && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <p className="text-sm text-destructive font-medium">{authError}</p>
                        </div>
                      )}

                      <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
                      </Button>
                    </form>
                  </>
                )}
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
