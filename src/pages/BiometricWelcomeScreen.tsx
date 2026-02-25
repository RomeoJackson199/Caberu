import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Mail,
  Shield,
  ChevronDown,
  Fingerprint,
  ScanFace,
  UserCircle2,
  UserRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOTPAuth } from "@/components/auth/PhoneOTPAuth";
import {
  useBiometricAuth,
  useStorageVault,
  useHaptics,
} from "@/hooks/useDespia";

const REMEMBERED_EMAIL_KEY = "caberu_remembered_email";
const REMEMBERED_NAME_KEY = "caberu_remembered_name";

const GoogleIcon = () => (
  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const BiometricWelcomeScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showOtherOptions, setShowOtherOptions] = useState(false);

  const rememberedName = localStorage.getItem(REMEMBERED_NAME_KEY) || "";
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  const firstName = rememberedName.split(" ")[0] || "there";
  const initials = rememberedName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const biometrics = useBiometricAuth();
  const haptics = useHaptics();
  const { value: savedCredentials, isLoading: vaultLoading, remove: removeCredentials } =
    useStorageVault<{ email: string; token: string }>("biometric_credentials");

  // Guard: check session and validate we should be here
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/auth-redirect", { replace: true });
        return;
      }
      if (!rememberedEmail) {
        navigate("/login", { replace: true });
        return;
      }
      setIsCheckingSession(false);
    });
  }, [navigate, rememberedEmail]);

  const handleBiometricContinue = useCallback(async () => {
    if (!biometrics.isAvailable) return;

    haptics.impact();
    const result = await biometrics.authenticate();

    if (result.authenticated) {
      haptics.success();
      if (savedCredentials?.token) {
        // Restore full session via saved refresh token
        setIsLoading(true);
        try {
          const { error } = await supabase.auth.refreshSession({
            refresh_token: savedCredentials.token,
          });
          if (error) throw error;
          navigate("/auth-redirect", { replace: true });
          return;
        } catch {
          // Token expired — fall through to login with email pre-filled
        } finally {
          setIsLoading(false);
        }
      }
      // No saved token or expired: verified identity, redirect to login
      const emailParam = rememberedEmail
        ? `&email=${encodeURIComponent(rememberedEmail)}`
        : "";
      navigate(`/login?skip-welcome=1${emailParam}`, { replace: true });
    } else if (
      result.error &&
      result.error !== "Authentication cancelled by user"
    ) {
      haptics.error();
      toast({
        title: "Authentication failed",
        description: "Tap 'Other options' to sign in a different way",
        variant: "destructive",
      });
    }
  }, [biometrics, savedCredentials, rememberedEmail, haptics, navigate, toast]);

  // Auto-prompt biometric on load once availability is confirmed
  useEffect(() => {
    if (
      !isCheckingSession &&
      biometrics.isAvailable &&
      !vaultLoading &&
      !searchParams.get("no-auto-prompt")
    ) {
      const timer = setTimeout(handleBiometricContinue, 600);
      return () => clearTimeout(timer);
    }
  }, [
    isCheckingSession,
    biometrics.isAvailable,
    vaultLoading,
    searchParams,
    handleBiometricContinue,
  ]);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth-redirect` },
      });
      if (error) throw error;
    } catch (error) {
      const { getDuplicateAccountMessage } = await import(
        "@/lib/authErrorUtils"
      );
      const dupMsg = getDuplicateAccountMessage(error);
      toast({
        title: dupMsg ? "Account already exists" : "Google sign in failed",
        description:
          dupMsg || "Unable to continue with Google. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleChangeAccount = async () => {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    localStorage.removeItem(REMEMBERED_NAME_KEY);
    await removeCredentials();
    navigate("/login", { replace: true });
  };

  const handleEmailAuth = () => {
    navigate("/login?skip-welcome=1");
  };

  if (isCheckingSession || vaultLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
      </div>
    );
  }

  const hasBiometrics = biometrics.isAvailable;
  const BiometricIcon =
    biometrics.biometricType === "faceId" ? ScanFace : Fingerprint;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="absolute top-[-20%] left-[-30%] w-[80%] h-[60%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[40%] rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center gap-2 px-6 pt-14 pb-4"
      >
        <Shield className="h-6 w-6 text-white/80" />
        <span className="text-xl font-bold text-white tracking-tight">
          Caberu
        </span>
      </motion.div>

      {/* Welcome content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center space-y-4"
        >
          {/* Avatar */}
          <div className="mx-auto w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 backdrop-blur-sm flex items-center justify-center shadow-lg">
            {initials ? (
              <span className="text-2xl font-bold text-white">{initials}</span>
            ) : (
              <UserRound className="h-10 w-10 text-white/80" />
            )}
          </div>

          {/* Welcome text */}
          <div className="space-y-1">
            <p className="text-white/80 text-base font-medium">Welcome back,</p>
            <h1 className="text-3xl font-bold text-white">{firstName}</h1>
            {rememberedEmail && (
              <p className="text-white/50 text-sm">{rememberedEmail}</p>
            )}
          </div>

          {/* Biometric icon hint */}
          {hasBiometrics && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <BiometricIcon className="h-9 w-9 text-white/40" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Bottom action panel */}
      <div className="relative z-10 px-5 pb-8 pb-safe space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            {/* Primary: biometric Continue */}
            {hasBiometrics ? (
              <Button
                onClick={handleBiometricContinue}
                disabled={isLoading || biometrics.isAuthenticating}
                className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg transition-all hover:scale-[1.02] disabled:opacity-60"
              >
                {biometrics.isAuthenticating || isLoading ? (
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                ) : (
                  <BiometricIcon className="mr-3 h-5 w-5" />
                )}
                Continue with {biometrics.label}
              </Button>
            ) : (
              /* Fallback if biometrics unavailable */
              <Button
                onClick={handleEmailAuth}
                disabled={isLoading}
                className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg transition-all hover:scale-[1.02] disabled:opacity-60"
              >
                <UserCircle2 className="mr-3 h-5 w-5" />
                Continue
              </Button>
            )}

            {/* Other options toggle */}
            <div className="relative py-0.5">
              <button
                type="button"
                onClick={() => setShowOtherOptions((v) => !v)}
                className="w-full flex items-center justify-center gap-2 text-xs uppercase text-white/60 hover:text-white/80 transition-colors"
              >
                <span className="flex-1 border-t border-white/20" />
                <span className="px-3 font-medium flex items-center gap-1">
                  Other options
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      showOtherOptions ? "rotate-180" : ""
                    }`}
                  />
                </span>
                <span className="flex-1 border-t border-white/20" />
              </button>
            </div>

            {/* Collapsible other options */}
            <AnimatePresence>
              {showOtherOptions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden space-y-4"
                >
                  {/* Phone OTP */}
                  <PhoneOTPAuth variant="glass" />

                  {/* Google */}
                  <Button
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-gray-800 hover:bg-gray-50 border-0 shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <GoogleIcon />
                        Continue with Google
                      </>
                    )}
                  </Button>

                  {/* Email */}
                  <Button
                    onClick={handleEmailAuth}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full h-14 text-base font-semibold rounded-2xl bg-white/15 text-white hover:bg-white/25 border-white/20 backdrop-blur-sm transition-all hover:scale-[1.02]"
                  >
                    <Mail className="mr-3 h-5 w-5" />
                    Continue with Email
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Change account */}
        <Button
          onClick={handleChangeAccount}
          variant="ghost"
          disabled={isLoading}
          className="w-full text-sm text-white/60 hover:text-white/90 hover:bg-white/10 rounded-xl transition-all"
        >
          Change account
        </Button>
      </div>
    </div>
  );
};

export default BiometricWelcomeScreen;
