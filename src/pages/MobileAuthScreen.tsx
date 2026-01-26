import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { toast as sonnerToast } from "sonner";

type AuthMode = null | "signup" | "signin";

const MobileAuthScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/auth-redirect", { replace: true });
        return;
      }

      // Returning user: skip the sign-up/sign-in choice and go straight to login
      const hasSignedInBefore = !!localStorage.getItem("caberu_remembered_email");
      if (hasSignedInBefore) {
        navigate("/login", { replace: true });
      }
    });
  }, [navigate]);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      if (authMode === "signup") {
        sessionStorage.setItem("pending_signup_user_type", "patient");
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth-redirect`,
        },
      });
      if (error) throw error;
    } catch {
      toast({
        title: "Google sign in failed",
        description: "Unable to continue with Google. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleEmailAuth = () => {
    if (authMode === "signup") {
      navigate("/signup");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="absolute top-[-20%] left-[-30%] w-[80%] h-[60%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[40%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-[30%] right-[-10%] w-[40%] h-[30%] rounded-full bg-primary-foreground/5 blur-2xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-white" />
            <h1 className="text-5xl font-bold text-white tracking-tight">
              Caberu
            </h1>
          </div>
          <p className="text-lg text-white/90 max-w-md">
            {authMode === null ? "Your complete dental care platform" :
             authMode === "signup" ? "Join thousands of dental practices" :
             "Welcome back to your workspace"}
          </p>
        </motion.div>
      </div>

      {/* Bottom auth panel */}
      <div className="relative z-10 px-5 pb-8 pb-safe">
        <AnimatePresence mode="wait">
          {authMode === null ? (
            /* Initial state: Sign up + I have an account */
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="space-y-3">
                <Button
                  onClick={() => setAuthMode("signup")}
                  className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg transition-all hover:scale-[1.02]"
                >
                  Sign up
                </Button>

                <Button
                  onClick={() => setAuthMode("signin")}
                  variant="ghost"
                  className="w-full h-12 text-base font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                  I have an account
                </Button>
              </div>
            </motion.div>
          ) : (
            /* Auth method selection: Google / Email */
            <motion.div
              key="method-selection"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white">
                  {authMode === "signup" ? "Create your account" : "Welcome back"}
                </h2>
                <p className="text-sm text-white/70">
                  {authMode === "signup"
                    ? "Choose your preferred sign up method"
                    : "Sign in to access your workspace"}
                </p>
              </div>

              <div className="space-y-3">
                {/* Google button */}
                <Button
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-gray-800 hover:bg-gray-50 border-0 shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-3 text-white/60 bg-transparent font-medium">or continue with</span>
                  </div>
                </div>

                {/* Email button */}
                <Button
                  onClick={handleEmailAuth}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-14 text-base font-semibold rounded-2xl bg-white/15 text-white hover:bg-white/25 border-white/20 backdrop-blur-sm transition-all hover:scale-[1.02]"
                >
                  <Mail className="mr-3 h-5 w-5" />
                  Continue with Email
                </Button>
              </div>

              {/* Back button */}
              <Button
                onClick={() => setAuthMode(null)}
                variant="ghost"
                className="w-full text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                Back
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MobileAuthScreen;
