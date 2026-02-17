import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Loader2, Shield, Mail, ArrowLeft, ChevronRight, Calendar, Sparkles, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';
import { motion, AnimatePresence } from "framer-motion";
import { validatePassword, checkPasswordBreach, getStrengthLabel, type PasswordStrength } from '@/utils/passwordValidation';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DentalPracticeConsentDialog, PatientTermsConsentDialog } from "@/components/consent";

type SignupView = "type" | "options" | "otp-verify" | "email-form";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signupView, setSignupView] = useState<SignupView>("type");
  const [userType, setUserType] = useState<"client" | "business" | null>(null);

  // Phone OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [phoneAuthError, setPhoneAuthError] = useState<string | null>(null);

  // Email form
  const [emailFormData, setEmailFormData] = useState({ email: "", password: "", confirmPassword: "" });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [isCheckingBreach, setIsCheckingBreach] = useState(false);

  // Consent / verification
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showEmailVerificationAlert, setShowEmailVerificationAlert] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/auth-redirect");
    });
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Password strength
  useEffect(() => {
    if (emailFormData.password) {
      setPasswordStrength(validatePassword(emailFormData.password));
    } else {
      setPasswordStrength(null);
    }
  }, [emailFormData.password]);

  const selectType = (type: "client" | "business") => {
    setUserType(type);
    setSignupView("options");
  };

  // ── Phone OTP ──────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsLoading(true);
    setPhoneAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          data: { role_type: userType === "client" ? "patient" : "owner" },
        },
      });
      if (error) throw error;
      setResendCooldown(60);
      setSignupView("otp-verify");
      toast({ title: "Code sent!", description: `We sent a 6-digit code to ${phone}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setPhoneAuthError(
        msg.includes("rate") ? "Too many attempts. Please wait before trying again." :
        "Failed to send SMS. Check your phone number and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setIsLoading(true);
    setPhoneAuthError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;

      toast({ title: "Welcome to Caberu!", description: "Your account has been created." });

      if (userType === "business") {
        navigate("/create-business");
      } else {
        navigate("/auth-redirect");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      setPhoneAuthError(
        msg.includes("invalid") || msg.includes("expired")
          ? "Invalid or expired code. Please try again."
          : "Verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google OAuth ───────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      if (userType) {
        sessionStorage.setItem('pending_signup_user_type', userType === "client" ? "patient" : "owner");
      }
      const redirectTo = userType === "business"
        ? `${window.location.origin}/create-business`
        : `${window.location.origin}/auth-redirect`;

      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
    } catch {
      toast({ title: "Google sign up failed", description: "Please try again or use another method.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  // ── Email / Password ───────────────────────────────────────
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (emailFormData.password !== emailFormData.confirmPassword) {
      setEmailError("Passwords don't match.");
      return;
    }

    if (!consentGiven) {
      setShowConsentDialog(true);
      return;
    }

    const strength = validatePassword(emailFormData.password);
    if (!strength.isValid) {
      setEmailError(strength.feedback.join('. '));
      return;
    }

    setIsCheckingBreach(true);
    try {
      const isBreached = await checkPasswordBreach(emailFormData.password);
      if (isBreached) {
        setEmailError("This password has been found in a data breach. Please choose a different one.");
        setIsCheckingBreach(false);
        return;
      }
    } catch (breachError) {
      logger.error('Breach check failed:', breachError);
    }
    setIsCheckingBreach(false);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailFormData.email,
        password: emailFormData.password,
        options: {
          emailRedirectTo: userType === "business"
            ? `${window.location.origin}/create-business`
            : `${window.location.origin}/auth-redirect`,
          data: { role_type: userType === "client" ? "patient" : "owner" },
        },
      });

      if (error) throw error;

      const selectedBusinessId = sessionStorage.getItem("selected_business_id");
      if (selectedBusinessId && data.user) {
        try {
          await supabase.functions.invoke('set-current-business', { body: { businessId: selectedBusinessId } });
          sessionStorage.removeItem('selected_business_id');
        } catch (err) {
          logger.error("Error setting business context:", err);
        }
      }

      setVerificationEmail(emailFormData.email);
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
        duration: 8000,
      });
      setTimeout(() => setShowEmailVerificationAlert(true), 500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      let friendly = "Unable to create account. Please try again.";
      if (msg.includes("already registered") || msg.includes("already exists")) {
        friendly = "An account with this email already exists. Please sign in instead.";
      } else if (msg.includes("invalid email")) {
        friendly = "The email address doesn't look right. Please check it.";
      } else if (msg.includes("password")) {
        friendly = "Your password needs to be stronger (8+ characters, mixed case, numbers, symbols).";
      } else if (msg.includes("network")) {
        friendly = "Connection issue. Please check your internet and try again.";
      }
      setEmailError(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="absolute top-[-20%] left-[-30%] w-[80%] h-[60%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[40%] rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Logo / heading */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2">
            <Shield className="h-8 w-8 text-white" />
            <span className="text-5xl font-bold text-white tracking-tight">Caberu</span>
          </div>
          <p className="text-lg text-white/80">
            {signupView === "type" ? "Your complete dental care platform" :
             signupView === "otp-verify" ? `Enter the code sent to ${phone}` :
             userType === "business" ? "Create your practice account" :
             "Create your patient account"}
          </p>
        </motion.div>
      </div>

      {/* Bottom panel */}
      <div className="relative z-10 px-5 pb-10">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Account type ── */}
          {signupView === "type" && (
            <motion.div
              key="type"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white">Create account</h2>
                <p className="text-sm text-white/65">I am signing up as:</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => selectType("client")}
                  className="w-full rounded-2xl bg-white/15 border border-white/20 p-4 text-left hover:bg-white/25 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2.5">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">A Client / Patient</p>
                      <p className="text-xs text-white/60 mt-0.5">Book appointments & manage dental records</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectType("business")}
                  className="w-full rounded-2xl bg-white/15 border border-white/20 p-4 text-left hover:bg-white/25 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2.5">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">A Business Owner</p>
                      <p className="text-xs text-white/60 mt-0.5">Manage your dental practice & grow your business</p>
                    </div>
                  </div>
                </button>
              </div>

              <p className="text-center text-sm text-white/60">
                Already have an account?{" "}
                <Link to="/login" className="text-white font-semibold hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </motion.div>
          )}

          {/* ── Step 2: Auth method — phone primary + other options ── */}
          {signupView === "options" && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSignupView("type"); setPhoneAuthError(null); }}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {userType === "business" ? "Set up your practice" : "Create your account"}
                  </h2>
                  <p className="text-sm text-white/60">Enter your phone number to get started</p>
                </div>
              </div>

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

                {phoneAuthError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/30">
                    <p className="text-sm text-white">{phoneAuthError}</p>
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
                  onClick={handleGoogleSignUp}
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
                  onClick={() => { setPhoneAuthError(null); setEmailError(null); setSignupView("email-form"); }}
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
                Already have an account?{" "}
                <Link to="/login" className="text-white font-semibold hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </motion.div>
          )}

          {/* ── Step 3a: OTP verification ── */}
          {signupView === "otp-verify" && (
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
                  onClick={() => { setSignupView("options"); setOtp(""); setPhoneAuthError(null); }}
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
                    className="h-13 bg-white/15 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:border-white/40 text-2xl tracking-[0.5em] text-center"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>

                {phoneAuthError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/30">
                    <p className="text-sm text-white">{phoneAuthError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="w-full h-12 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                </Button>
              </form>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-white/50">Resend code in {resendCooldown}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleSendOtp(e as unknown as React.FormEvent)}
                    disabled={isLoading}
                    className="text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Didn't receive a code? <span className="font-semibold text-white">Resend</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 3b: Email / password sign up ── */}
          {signupView === "email-form" && (
            <motion.div
              key="email-form"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSignupView("options"); setEmailError(null); }}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-white">Sign up with Email</h2>
                </div>
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-3" role="form" aria-label="Sign up form">
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

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-white/80 text-sm">Create Password</Label>
                  <FormField
                    id="password"
                    type="password"
                    placeholder="Minimum 12 characters"
                    value={emailFormData.password}
                    onChange={(e) => setEmailFormData({ ...emailFormData, password: e.target.value })}
                    className="h-12 bg-white/15 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:border-white/40"
                    required
                    showPasswordToggle
                    showCharacterCount={false}
                  />
                  {passwordStrength && emailFormData.password && (
                    <div className="space-y-1">
                      <Progress value={(passwordStrength.score / 5) * 100} className="h-1.5" />
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${getStrengthLabel(passwordStrength.score).color}`}>
                          {getStrengthLabel(passwordStrength.score).label}
                        </span>
                        {isCheckingBreach && <span className="text-xs text-white/50">Checking security…</span>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-white/80 text-sm">Confirm Password</Label>
                  <FormField
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={emailFormData.confirmPassword}
                    onChange={(e) => setEmailFormData({ ...emailFormData, confirmPassword: e.target.value })}
                    className="h-12 bg-white/15 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:border-white/40"
                    required
                    showPasswordToggle
                    showCharacterCount={false}
                    validate={(value) => {
                      if (value && emailFormData.password && value !== emailFormData.password) {
                        return "Passwords don't match";
                      }
                      return undefined;
                    }}
                    success={!!(emailFormData.confirmPassword && emailFormData.password && emailFormData.confirmPassword === emailFormData.password)}
                  />
                </div>

                {emailError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/30">
                    <p className="text-sm text-white">{emailError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                </Button>

                <p className="text-center text-xs text-white/50">
                  By signing up you agree to our{" "}
                  <Link to="/terms" className="text-white/80 hover:text-white underline underline-offset-2">Terms</Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-white/80 hover:text-white underline underline-offset-2">Privacy Policy</Link>
                </p>
              </form>

              <p className="text-center text-sm text-white/60">
                Already have an account?{" "}
                <Link to="/login" className="text-white font-semibold hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Email Verification Alert */}
      <AlertDialog open={showEmailVerificationAlert} onOpenChange={setShowEmailVerificationAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-40 animate-pulse" />
                <div className="relative bg-primary/10 rounded-full p-4">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">Check Your Email</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p className="text-base">We've sent a verification link to:</p>
              <p className="font-semibold text-lg text-foreground bg-muted px-4 py-2 rounded-lg">
                {verificationEmail}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-left">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Click the link in the email to activate your account</span>
                </div>
                <div className="flex items-start gap-2 text-left">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Check your spam folder if you don't see it</span>
                </div>
                <div className="flex items-start gap-2 text-left">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>The link expires in 24 hours</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowEmailVerificationAlert(false);
                if (userType === "business") setTimeout(() => navigate("/create-business"), 300);
              }}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Got it, I'll check my email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Consent dialogs */}
      {userType === "business" && (
        <DentalPracticeConsentDialog
          open={showConsentDialog}
          onOpenChange={setShowConsentDialog}
          onAccept={(consentData) => {
            setConsentGiven(true);
            sessionStorage.setItem('pending_practice_consent', JSON.stringify(consentData));
            handleEmailSignUp(new Event('submit') as unknown as React.FormEvent);
          }}
        />
      )}
      {userType === "client" && (
        <PatientTermsConsentDialog
          open={showConsentDialog}
          onOpenChange={setShowConsentDialog}
          onAccept={(consentData) => {
            setConsentGiven(true);
            sessionStorage.setItem('pending_patient_terms_consent', JSON.stringify(consentData));
            handleEmailSignUp(new Event('submit') as unknown as React.FormEvent);
          }}
        />
      )}
    </div>
  );
};

export default Signup;
