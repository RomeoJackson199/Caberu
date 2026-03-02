import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MessageSquare, FileText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';
import { SignupFormWithPhone } from "@/components/auth/SignupFormWithPhone";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"client" | "business" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/auth-redirect");
    });
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (userType) {
        sessionStorage.setItem('pending_signup_user_type', userType === "client" ? "patient" : "owner");
      }

      const redirectTo = userType === "business"
        ? `${window.location.origin}/create-business`
        : `${window.location.origin}/auth-redirect`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error) {
      logger.error("Google sign up error:", error);
      toast({
        title: "❌ Google sign up failed",
        description: "Unable to sign up with Google. Please try again.",
        variant: "destructive",
        duration: 6000,
      });
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      if (userType) {
        sessionStorage.setItem('pending_signup_user_type', userType === "client" ? "patient" : "owner");
      }

      const redirectTo = userType === "business"
        ? `${window.location.origin}/create-business`
        : `${window.location.origin}/auth-redirect`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error) {
      logger.error("Apple sign up error:", error);
      toast({
        title: "❌ Apple sign up failed",
        description: "Unable to sign up with Apple. Please try again.",
        variant: "destructive",
        duration: 6000,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight mb-3">SIGN UP</h1>
            <p className="text-muted-foreground text-sm">
              Get instant access to AI-powered dental care management
            </p>
          </div>

          {/* User Type Selection */}
          {!userType && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center mb-6">I am signing up as:</h2>
              <div className="grid gap-4">
                <button
                  onClick={() => setUserType("client")}
                  className="group relative overflow-hidden rounded-xl border-2 border-muted hover:border-primary transition-all p-6 text-left bg-background hover:bg-accent"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
                      <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">A Client</h3>
                      <p className="text-sm text-muted-foreground">
                        Book appointments, manage your dental records, and communicate with your dentist
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setUserType("business")}
                  className="group relative overflow-hidden rounded-xl border-2 border-muted hover:border-primary transition-all p-6 text-left bg-background hover:bg-accent"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
                      <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">A Business Owner</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage your dental practice, schedule appointments, and grow your business
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Sign Up Form - Only show after user type is selected */}
          {userType && (
            <SignupFormWithPhone
              userType={userType}
              setUserType={setUserType}
              handleGoogleSignIn={handleGoogleSignIn}
              handleAppleSignIn={handleAppleSignIn}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-indigo-800/90" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-5 w-5" />
              Join 5,000+ people already managing dental care with AI
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-6xl font-bold leading-tight mb-4">
                APPOINTMENTS
                <br />
                MADE SIMPLE —{" "}
                <span className="text-white/90">INSTANTLY</span>
              </h2>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-md border border-white/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Michael"
                    alt="User"
                    className="w-full h-full rounded-full"
                  />
                </div>
                <div>
                  <p className="text-white/95 mb-3 leading-relaxed">
                    "Finally, something that actually understands my needs. The AI assistant feels like having a real dental coordinator."
                  </p>
                  <p className="font-semibold">Michael Chen</p>
                  <p className="text-sm text-white/70">Verified Patient</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <Calendar className="h-6 w-6 mb-2" />
                <p className="text-sm font-medium">Smart Scheduling</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <MessageSquare className="h-6 w-6 mb-2" />
                <p className="text-sm font-medium">AI Chat Support</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <FileText className="h-6 w-6 mb-2" />
                <p className="text-sm font-medium">Health Records</p>
              </div>
            </div>

            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <div className="w-2 h-2 rounded-full bg-white/50"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
