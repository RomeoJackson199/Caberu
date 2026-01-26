import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-b from-primary via-primary/85 to-primary/70">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
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
        >
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Caberu
          </h1>
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
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 space-y-4"
            >
              <Button
                onClick={() => setAuthMode("signup")}
                className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/90 shadow-lg"
              >
                Sign up
              </Button>

              <button
                onClick={() => setAuthMode("signin")}
                className="w-full text-center text-base font-medium text-white/90 hover:text-white transition-colors py-2"
              >
                I have an account
              </button>
            </motion.div>
          ) : (
            /* Auth method selection: Google / Email */
            <motion.div
              key="method-selection"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 space-y-4"
            >
              <h2 className="text-center text-lg font-semibold text-white mb-2">
                {authMode === "signup" ? "Create your account" : "Welcome back"}
              </h2>

              {/* Google button */}
              <Button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                variant="outline"
                className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-gray-800 hover:bg-gray-50 border-0 shadow-lg"
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
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-3 text-white/50 bg-transparent">or</span>
                </div>
              </div>

              {/* Email button */}
              <Button
                onClick={handleEmailAuth}
                disabled={isLoading}
                variant="outline"
                className="w-full h-14 text-base font-semibold rounded-2xl bg-white/15 text-white hover:bg-white/25 border-white/20 backdrop-blur-sm"
              >
                <Mail className="mr-3 h-5 w-5" />
                Continue with Email
              </Button>

              {/* Back button */}
              <button
                onClick={() => setAuthMode(null)}
                className="w-full text-center text-sm text-white/60 hover:text-white/80 transition-colors py-1"
              >
                Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MobileAuthScreen;
