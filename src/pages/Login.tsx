import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Loader2, Shield, Mail, ArrowLeft, ChevronRight, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

import { TwoFactorVerificationDialog } from "@/components/auth/TwoFactorVerificationDialog";
import { logger } from '@/lib/logger';
import { useDespiaNative, useBiometricAuth, useHaptics, useStorageVault } from '@/hooks/useDespia';

const REMEMBERED_EMAIL_KEY = "caberu_remembered_email";
const REMEMBERED_NAME_KEY = "caberu_remembered_name";
const PREFILLED_BUSINESS_KEY = "caberu_prefilled_business";

type LoginView = "options" | "otp-verify" | "email-form";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginView, setLoginView] = useState<LoginView>("options");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Email form state
  const [emailFormData, setEmailFormData] = useState({ email: "", password: "" });

  useEffect(() => {
    const businessSlug = searchParams.get("business");
    if (businessSlug) {
      localStorage.setItem(PREFILLED_BUSINESS_KEY, businessSlug.toLowerCase());
    }
  }, [searchParams]);

  const [show2FADialog, setShow2FADialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [is2FAPending, setIs2FAPending] = useState(false);

  // Returning user detection
  const [rememberedEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || "");
  const [rememberedName] = useState(() => localStorage.getItem(REMEMBERED_NAME_KEY) || "");
  const [isReturningUser] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY));

  // Native Apple features
  const isNative = useDespiaNative();
  const biometrics = useBiometricAuth();
  const haptics = useHaptics();
  const { value: savedCredentials, save: saveCredentials } = useStorageVault<{ email: string; token: string }>('biometric_credentials');

  // If returning user, skip to email form (they previously used email)
  useEffect(() => {
    if (isReturningUser) {
      setEmailFormData(prev => ({ ...prev, email: rememberedEmail }));
      setLoginView("email-form");
    }
  }, [isReturningUser, rememberedEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let isMounted = true;

    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted || is2FAPending) return;
        if (session) {
          const has2FA = session.user?.user_metadata?.two_factor_enabled === true;
          if (!has2FA) navigate("/auth-redirect");
        }
      } catch (error) {
        logger.error("Error checking auth state:", error);
      }
    };

    checkAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted || is2FAPending) return;
      if (session) {
        const has2FA = session.user?.user_metadata?.two_factor_enabled === true;
        if (!has2FA) navigate("/auth-redirect");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, is2FAPending]);

  const handleBiometricLogin = async () => {
    if (!biometrics.isAvailable) return;
    haptics.impact();
    const result = await biometrics.authenticate();

    if (result.authenticated && savedCredentials) {
      haptics.success();
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.refreshSession({ refresh_token: savedCredentials.token });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Signed in with Face ID" });
        navigate("/select-business");
      } catch {
        haptics.error();
        toast({ title: "Biometric login failed", description: "Please sign in again", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else if (!result.authenticated) {
      haptics.error();
      toast({ title: "Authentication failed", description: result.error || "Please try again", variant: "destructive" });
    }
  };

  // ── Phone OTP ──────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setResendCooldown(60);
      setLoginView("otp-verify");
      toast({ title: "Code sent!", description: `We sent a 6-digit code to ${phone}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send code";
      setAuthError(msg.includes("rate") ? "Too many attempts. Please wait before trying again." : "Failed to send SMS. Check your phone number and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setIsLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;

      if (data.user?.email) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, data.user.email);
        const displayName = data.user.user_metadata?.first_name || data.user.email.split("@")[0];
        localStorage.setItem(REMEMBERED_NAME_KEY, displayName);
      }

      haptics.success();
      toast({ title: "Welcome back!", description: "You've successfully signed in." });
      navigate("/auth-redirect");
    } catch (err: unknown) {
      haptics.error();
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      setAuthError(msg.includes("invalid") || msg.includes("expired")
        ? "Invalid or expired code. Please try again."
        : "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Email / Password ───────────────────────────────────────
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const rateLimitCheck = await supabase.functions.invoke('check-login-rate-limit', {
        body: { email: emailFormData.email }
      });
      if (rateLimitCheck.error || !rateLimitCheck.data?.allowed) {
        const minutes = Math.ceil((rateLimitCheck.data?.retry_after || 900) / 60);
        setAuthError(`Too many login attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        setIsLoading(false);
        return;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: emailFormData.email,
        password: emailFormData.password,
      });
      if (error) throw error;

      if (!authData.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        toast({
          title: "Email Not Verified",
          description: "Please verify your email address before signing in.",
          variant: "destructive",
          duration: 10000,
        });
        setIsLoading(false);
        return;
      }

      const twoFactorEnabled = authData.user?.user_metadata?.two_factor_enabled === true;
      if (twoFactorEnabled) {
        setIs2FAPending(true);
        setUserEmail(emailFormData.email);
        setShow2FADialog(true);
        setIsLoading(false);
        return;
      }

      await completeEmailLogin();
    } catch (err: unknown) {
      logger.error("Sign in error:", err);
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      let friendly = "Unable to sign in. Please try again.";
      if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password")) {
        friendly = "The email or password you entered is incorrect.";
      } else if (msg.includes("email not confirmed")) {
        friendly = "Your email hasn't been verified yet. Check your inbox.";
      } else if (msg.includes("network") || msg.includes("fetch")) {
        friendly = "Connection issue. Please check your internet.";
      }
      setAuthError(friendly);
      setIsLoading(false);
    }
  };

  const completeEmailLogin = async () => {
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
          localStorage.setItem(REMEMBERED_NAME_KEY, user.user_metadata?.first_name || user.email.split("@")[0]);
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
            user_id: user.id,
            event_type: '2fa_login',
            metadata: { timestamp: new Date().toISOString() }
          });
        }
      } catch (logErr) {
        console.error('Failed to log 2FA login:', logErr);
      }
      await completeEmailLogin();
    } catch {
      toast({ title: "Sign in failed", description: "Failed to complete sign in after 2FA", variant: "destructive" });
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
    } catch {
      toast({ title: "Google sign in failed", description: "Please try again or use another method.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="absolute top-[-20%] left-[-30%] w-[80%] h-[60%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[40%] rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Logo / heading — left on desktop, top on mobile */}
      <div className="relative z-10 flex-1 flex flex-col items-center lg:items-start justify-center px-8 lg:px-16 py-12 text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2">
            <Shield className="h-8 w-8 text-white" />
            <span className="text-5xl font-bold text-white tracking-tight">Caberu</span>
          </div>
          <p className="text-lg text-white/80 max-w-sm">
            {isReturningUser && rememberedName
              ? `Welcome back, ${rememberedName}`
              : "Sign in to your dental workspace"}
          </p>
          {isReturningUser && rememberedEmail && (
            <p className="text-sm text-white/55">{rememberedEmail}</p>
          )}
          {/* Desktop tagline */}
          <p className="hidden lg:block text-sm text-white/60 max-w-xs pt-2">
            Manage appointments, patient records, and your practice from anywhere.
          </p>
        </motion.div>
      </div>

      {/* Auth panel — right on desktop, bottom on mobile */}
      <div className="relative z-10 lg:flex-none lg:w-[440px] flex flex-col justify-end lg:justify-center px-5 pb-10 lg:px-8 lg:py-12">
        <AnimatePresence mode="wait">

          {/* ── Main options: Phone (primary) + Other options ── */}
          {loginView === "options" && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white">Sign in</h2>
                <p className="text-sm text-white/65">Enter your phone number to continue</p>
              </div>

              {/* Face ID (iOS native only) */}
              {isNative && biometrics.isAvailable && savedCredentials && (
                <Button
                  onClick={handleBiometricLogin}
                  disabled={isLoading || biometrics.isAuthenticating}
                  className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-gray-800 hover:bg-gray-50 border-0 shadow-lg"
                >
                  <Fingerprint className="mr-3 h-5 w-5 text-blue-600" />
                  {biometrics.isAuthenticating ? "Authenticating…" : "Sign in with Face ID"}
                </Button>
              )}

              {/* Phone form */}
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-white/80 text-sm">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-13 bg-white/15 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:border-white/40 text-base"
                    required
                    autoFocus
                    autoComplete="tel"
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/30">
                    <p className="text-sm text-white">{authError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !phone.trim()}
                  className="w-full h-13 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Code"}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-3 text-white/50 font-medium tracking-wider">Other options</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Google */}
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-13 text-base font-semibold rounded-2xl bg-white text-gray-800 hover:bg-gray-50 border-0 shadow-lg disabled:opacity-50"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                {/* Email */}
                <Button
                  onClick={() => { setAuthError(null); setLoginView("email-form"); }}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-13 text-base font-semibold rounded-2xl bg-white/15 text-white hover:bg-white/25 border-white/20 backdrop-blur-sm flex items-center justify-between px-5"
                >
                  <span className="flex items-center gap-3">
                    <Mail className="h-5 w-5" />
                    Continue with Email
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </Button>
              </div>

              <p className="text-center text-sm text-white/60">
                Don't have an account?{" "}
                <Link to="/signup" className="text-white font-semibold hover:underline underline-offset-4">
                  Sign up
                </Link>
              </p>
            </motion.div>
          )}

          {/* ── OTP Verification ── */}
          {loginView === "otp-verify" && (
            <motion.div
              key="otp-verify"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setLoginView("options"); setOtp(""); setAuthError(null); }}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-white">Verify your number</h2>
                  <p className="text-sm text-white/60">{phone}</p>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="otp" className="text-white/80 text-sm">6-digit code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="h-14 bg-white/15 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:border-white/40 text-3xl tracking-[0.75em] text-center"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/30">
                    <p className="text-sm text-white">{authError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="w-full h-12 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Sign in"}
                </Button>
              </form>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-white/50">Resend code in {resendCooldown}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { handleSendOtp(e as unknown as React.FormEvent); }}
                    disabled={isLoading}
                    className="text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Didn't receive a code? <span className="font-semibold text-white">Resend</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Email / Password fallback ── */}
          {loginView === "email-form" && (
            <motion.div
              key="email-form"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                {!isReturningUser && (
                  <button
                    onClick={() => { setLoginView("options"); setAuthError(null); }}
                    className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isReturningUser
                      ? `Welcome back${rememberedName ? `, ${rememberedName}` : ""}`
                      : "Sign in with Email"}
                  </h2>
                </div>
              </div>

              <form onSubmit={handleEmailSignIn} className="space-y-3" role="form" aria-label="Sign in form">
                {!isReturningUser && (
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-white/80 text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@email.com"
                      value={emailFormData.email}
                      onChange={(e) => setEmailFormData({ ...emailFormData, email: e.target.value })}
                      className="h-12 bg-white/15 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:border-white/40"
                      required
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white/80 text-sm">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-white/60 hover:text-white transition-colors">
                      Forgot?
                    </Link>
                  </div>
                  <FormField
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={emailFormData.password}
                    onChange={(e) => setEmailFormData({ ...emailFormData, password: e.target.value })}
                    className="h-12 bg-white/15 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:border-white/40"
                    required
                    autoFocus={isReturningUser}
                    autoComplete="current-password"
                    showPasswordToggle
                    showCharacterCount={false}
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/30">
                    <p className="text-sm text-white">{authError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
                </Button>
              </form>

              {isReturningUser && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
                    localStorage.removeItem(REMEMBERED_NAME_KEY);
                    setEmailFormData({ email: "", password: "" });
                    setLoginView("options");
                  }}
                  className="w-full text-center text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  Not {rememberedName || rememberedEmail}?{" "}
                  <span className="text-white/80 font-medium">Use a different account</span>
                </button>
              )}

              <p className="text-center text-sm text-white/60">
                Don't have an account?{" "}
                <Link to="/signup" className="text-white font-semibold hover:underline underline-offset-4">
                  Sign up
                </Link>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

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
