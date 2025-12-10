import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Sparkles, Zap, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BusinessSelector } from "@/components/auth/BusinessSelector";
import { TwoFactorVerificationDialog } from "@/components/auth/TwoFactorVerificationDialog";
import { logger } from '@/lib/logger';

type Business = {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  template_type?: string | null;
};

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null); // SECURITY: No client-side storage - server-side only via session_business table
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [is2FAPending, setIs2FAPending] = useState(false); // FIXED: Use state instead of ref for proper reactivity
  const [isProcessingAuth, setIsProcessingAuth] = useState(false); // Prevent concurrent auth checks
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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

  useEffect(() => {
    const loadBusinesses = async () => {
      setIsLoadingBusinesses(true);
      try {
        try {
          const { data, error } = await supabase
            .from("public_businesses_view")
            .select("id, name, tagline, logo_url:branding_settings->logo_url, template_type")
            .in('template_type', ['healthcare', 'dentist'])
            .order("name");

          if (error) throw error;
          setBusinesses(data || []);
        } catch (error) {
          logger.error("Error loading businesses:", error);
        } finally {
          setIsLoadingBusinesses(false);
        }
      };

      loadBusinesses();
    }, []);


  const handleSelectBusiness = (businessId: string) => {
    // SECURITY: Business ID stored server-side only via session_business table (set after auth)
    setSelectedBusinessId(businessId);

    const business = businesses.find((item) => item.id === businessId);
    if (business) {
      toast({
        title: `${business.name} selected`,
        description: "You're all set to sign in to this workspace.",
        duration: 3500,
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate business selection first
    if (!selectedBusinessId) {
      toast({
        title: "Business required",
        description: "Please select a business before signing in.",
        variant: "destructive",
        duration: 5000,
      });
      setShowBusinessSelector(true);
      return;
    }

    setIsLoading(true);

    try {
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
    } catch (error) {
      const errorMessage = error.message.toLowerCase();
      let userFriendlyMessage = "Unable to sign in. Please try again.";

      if (errorMessage.includes("invalid") || errorMessage.includes("credentials")) {
        userFriendlyMessage = "The email or password you entered is incorrect. Please double-check and try again.";
      } else if (errorMessage.includes("email not confirmed")) {
        userFriendlyMessage = "Your email address hasn't been verified yet. Please check your inbox for the confirmation link.";
      } else if (errorMessage.includes("network")) {
        userFriendlyMessage = "We're having trouble connecting. Please check your internet connection and try again.";
      }

      toast({
        title: "Sign in failed",
        description: userFriendlyMessage,
        variant: "destructive",
        duration: 6000,
      });
      setIsLoading(false);
    }
  };

  const completeLogin = async () => {
    try {
      const storedBusinessId = sessionStorage.getItem("selected_business_id"); // SECURITY: Use sessionStorage
      if (storedBusinessId) {
        const { data, error: businessError } = await supabase.functions.invoke(
          "set-current-business",
          {
            body: { businessId: storedBusinessId },
          }
        );

        if (businessError) {
          logger.error("Error setting business context:", businessError);
          toast({
            title: "Warning",
            description: "Failed to set business context. Please select your business again.",
            variant: "destructive",
            duration: 5000,
          });
        } else if (!data?.success) {
          logger.error("Failed to set business context:", data);
          toast({
            title: "Warning",
            description: "Failed to set business context. Please select your business again.",
            variant: "destructive",
            duration: 5000,
          });
        }

        sessionStorage.removeItem("selected_business_id"); // SECURITY: Use sessionStorage
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      // Navigate to auth-redirect after successful login
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

  const handleGoogleSignIn = async () => {
    // Validate business selection first
    if (!selectedBusinessId) {
      toast({
        title: "Business required",
        description: "Please select a business before signing in.",
        variant: "destructive",
        duration: 5000,
      });
      setShowBusinessSelector(true);
      return;
    }

    setIsLoading(true);
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
            {/* Business Selector */}
            <BusinessSelector
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              isLoading={isLoadingBusinesses}
              onSelectBusiness={handleSelectBusiness}
              variant="compact"
              open={showBusinessSelector}
              onOpenChange={setShowBusinessSelector}
            />

            {/* Dialog for mobile/all platforms */}
            <BusinessSelector
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              isLoading={isLoadingBusinesses}
              onSelectBusiness={handleSelectBusiness}
              variant="dialog"
              open={showBusinessSelector}
              onOpenChange={setShowBusinessSelector}
            />

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="space-y-4">
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
