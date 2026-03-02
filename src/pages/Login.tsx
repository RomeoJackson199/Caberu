import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Shield, Sparkles, Zap, Clock, Fingerprint, User, Phone, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TwoFactorVerificationDialog } from "@/components/auth/TwoFactorVerificationDialog";
import { PhoneOTPAuth } from "@/components/auth/PhoneOTPAuth";
import { logger } from '@/lib/logger';
import { useDespiaNative, useBiometricAuth, useHaptics, useStorageVault } from '@/hooks/useDespia';

const REMEMBERED_EMAIL_KEY = "caberu_remembered_email";
const REMEMBERED_NAME_KEY = "caberu_remembered_name";
const PREFILLED_BUSINESS_KEY = "caberu_prefilled_business";

const GoogleIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AppleIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // If coming from a business profile page (?business=slug), store it
  useEffect(() => {
    const businessSlug = searchParams.get("business");
    if (businessSlug) {
      localStorage.setItem(PREFILLED_BUSINESS_KEY, businessSlug.toLowerCase());
    }
  }, [searchParams]);

  const [show2FADialog, setShow2FADialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [is2FAPending, setIs2FAPending] = useState(false);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  // Returning user detection
  const [rememberedEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || "");
  const [rememberedName] = useState(() => localStorage.getItem(REMEMBERED_NAME_KEY) || "");
  const [isReturningUser, setIsReturningUser] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY));

  const [formData, setFormData] = useState({
    email: localStorage.getItem(REMEMBERED_EMAIL_KEY) || "",
  });

  // Email OTP state
  const [emailOtpStep, setEmailOtpStep] = useState<"email" | "code">("email");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  // Phone login state
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);

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
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: savedCredentials.token
        });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Signed in with Face ID" });
        navigate("/select-business");
      } catch (error) {
        haptics.error();
        toast({ title: "Biometric login failed", description: "Please sign in with your email and password", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else if (!result.authenticated) {
      haptics.error();
      toast({ title: "Authentication failed", description: result.error || "Please try again", variant: "destructive" });
    } else if (!savedCredentials) {
      haptics.warning();
      toast({ title: "No saved credentials", description: "Sign in once with email to enable biometric login" });
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
          if (!has2FA) navigate("/auth-redirect");
        }
      } catch (error) {
        logger.error("Error checking auth state:", error);
      }
    };
    checkAuthState();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || is2FAPending || isProcessingAuth) return;
      if (session) {
        const has2FA = session?.user?.user_metadata?.two_factor_enabled === true;
        if (!has2FA) navigate("/auth-redirect");
      }
    });
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, [navigate, is2FAPending, isProcessingAuth]);

  const handleSendEmailOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.email || !formData.email.includes('@')) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
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
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
      });
      if (error) throw error;
      setEmailOtpStep("code");
      toast({ title: "Code sent!", description: `We sent a 6-digit code to ${formData.email}` });
    } catch (error: unknown) {
      logger.error("Email OTP error:", error);
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      let userFriendlyMessage = "Unable to send code. Please try again.";
      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userFriendlyMessage = "We're having trouble connecting. Please check your internet connection.";
      } else if (errorMessage.includes("rate") || errorMessage.includes("limit")) {
        userFriendlyMessage = "Too many attempts. Please wait a moment and try again.";
      }
      setAuthError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOTP = async (completedCode?: string) => {
    const code = completedCode ?? emailOtpCode;
    if (code.length < 6) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: code,
        type: "email",
      });
      if (error) throw error;
      if (authData.user) {
        const twoFactorEnabled = authData.user?.user_metadata?.two_factor_enabled === true;
        if (twoFactorEnabled) {
          setIs2FAPending(true);
          setUserEmail(formData.email);
          setShow2FADialog(true);
          setIsLoading(false);
          return;
        }
      }
      await completeLogin();
    } catch (error: unknown) {
      logger.error("Email OTP verify error:", error);
      const msg = error instanceof Error ? error.message : "Invalid code. Please try again.";
      setAuthError(msg);
      setEmailOtpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = async () => {
    try {
      if (isNative && biometrics.isAvailable) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.refresh_token && session.user?.email) {
            await saveCredentials({ email: session.user.email, token: session.refresh_token }, true);
          }
        } catch (err) {
          logger.error("Failed to save biometric credentials:", err);
        }
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, user.email);
          const displayName = user.user_metadata?.first_name || user.email.split("@")[0];
          localStorage.setItem(REMEMBERED_NAME_KEY, displayName);
        }
      } catch (err) {
        logger.error("Failed to save remembered user:", err);
      }
      haptics.success();
      toast({ title: "Welcome back!", description: "You've successfully signed in." });
      navigate("/auth-redirect");
    } catch (error) {
      logger.error("Error completing login:", error);
    }
  };

  const handle2FASuccess = async () => {
    setIsLoading(true);
    setIs2FAPending(false);
    try {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('security_audit_logs').insert({
            user_id: user.id, event_type: '2fa_login',
            metadata: { timestamp: new Date().toISOString() }
          });
        }
      } catch (logError) {
        logger.error('Failed to log 2FA login:', logError);
      }
      await completeLogin();
    } catch (error) {
      toast({ title: "Sign in failed", description: "Failed to complete sign in after 2FA verification", variant: "destructive" });
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
        options: { redirectTo: `${window.location.origin}/auth-redirect` },
      });
      if (error) throw error;
    } catch (error) {
      toast({ title: "Google sign in failed", description: "Unable to sign in with Google. Please try again.", variant: "destructive" });
      setAuthError("Unable to sign in with Google.");
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/auth-redirect` },
      });
      if (error) throw error;
    } catch (error) {
      toast({ title: "Apple sign in failed", description: "Unable to sign in with Apple. Please try again.", variant: "destructive" });
      setAuthError("Unable to sign in with Apple.");
      setIsLoading(false);
    }
  };

  const handlePhoneSignIn = () => {
    setShowPhoneLogin(true);
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
                Welcome back to<br />your workspace
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
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back{rememberedName ? `, ${rememberedName}` : ""}
                </h1>
                <p className="text-sm text-muted-foreground">{rememberedEmail}</p>
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

                {showPhoneLogin ? (
                  /* Phone OTP Login */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPhoneLogin(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <h2 className="text-base font-semibold">Sign in with Phone</h2>
                    </div>
                    <PhoneOTPAuth variant="default" />
                  </div>
                ) : emailOtpStep === "email" ? (
                  /* Email OTP - Step 1: Enter Email */
                  <form onSubmit={handleSendEmailOTP} className="space-y-4" role="form" aria-label="Sign in form">
                    {!isReturningUser && (
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
                          autoComplete="email"
                          aria-label="Email"
                          aria-required="true"
                        />
                      </div>
                    )}

                    {authError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive font-medium">{authError}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="h-12 w-full text-base font-semibold"
                      disabled={isLoading || !formData.email}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Mail className="mr-2 h-5 w-5" />
                          Send Sign-in Code
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  /* Email OTP - Step 2: Enter Code */
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to
                      </p>
                      <p className="text-sm font-semibold">{formData.email}</p>
                    </div>

                    <div className="flex justify-center">
                      <InputOTP
                        value={emailOtpCode}
                        onChange={setEmailOtpCode}
                        maxLength={6}
                        onComplete={handleVerifyEmailOTP}
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot key={index} index={index} className="h-12 w-10" />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {authError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive font-medium">{authError}</p>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={() => handleVerifyEmailOTP()}
                      className="h-12 w-full text-base font-semibold"
                      disabled={isLoading || emailOtpCode.length < 6}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Verify & Sign In"
                      )}
                    </Button>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailOtpStep("email");
                          setEmailOtpCode("");
                          setAuthError(null);
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Change email
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendEmailOTP()}
                        disabled={isLoading}
                        className="text-sm text-primary hover:underline transition-colors disabled:opacity-50"
                      >
                        Resend code
                      </button>
                    </div>
                  </div>
                )}

                {/* Returning user switch */}
                {isReturningUser && emailOtpStep === "email" && !showPhoneLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReturningUser(false);
                      setFormData({ email: "" });
                    }}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Not {rememberedName || rememberedEmail}?{" "}
                    <span className="text-primary font-medium">Use a different account</span>
                  </button>
                )}

                {/* Divider - hide when in OTP code step or phone login */}
                {emailOtpStep === "email" && !showPhoneLogin && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-3 text-muted-foreground">Or sign in with</span>
                      </div>
                    </div>

                    {/* Social Sign In Icons - 3 in a row */}
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="h-12 border-2 hover:bg-accent"
                        aria-label="Sign in with Google"
                      >
                        <GoogleIcon />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePhoneSignIn}
                        disabled={isLoading}
                        className="h-12 border-2 hover:bg-accent"
                        aria-label="Sign in with Phone"
                      >
                        <Phone className="h-5 w-5 text-primary" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAppleSignIn}
                        disabled={isLoading}
                        className="h-12 border-2 hover:bg-accent"
                        aria-label="Sign in with Apple"
                      >
                        <AppleIcon />
                      </Button>
                    </div>
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
              <Link to="/terms" className="underline hover:text-foreground">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
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
