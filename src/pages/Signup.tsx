import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, validators } from "@/components/ui/form-field";
import { Loader2, Calendar, MessageSquare, FileText, Sparkles, Mail, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';
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

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"client" | "business" | null>(null);
  const [showEmailVerificationAlert, setShowEmailVerificationAlert] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [isCheckingBreach, setIsCheckingBreach] = useState(false);

  // Real-time password validation
  useEffect(() => {
    if (formData.password) {
      const strength = validatePassword(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  useEffect(() => {
    // Only redirect if user already has a session when landing on the page.
    // Don't set up onAuthStateChange redirect here because it would
    // prematurely redirect business users away from the email verification
    // dialog after a successful signup.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/auth-redirect");
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    // Require consent before signup for ALL user types
    if (!consentGiven) {
      setShowConsentDialog(true);
      return;
    }

    // SECURITY: Validate password strength before signup
    const strength = validatePassword(formData.password);
    if (!strength.isValid) {
      toast({
        title: "Password Too Weak",
        description: strength.feedback.join('. '),
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    // SECURITY: Check for breached passwords
    setIsCheckingBreach(true);
    try {
      const isBreached = await checkPasswordBreach(formData.password);
      if (isBreached) {
        toast({
          title: "Compromised Password",
          description: "This password has been found in a data breach. Please choose a different password.",
          variant: "destructive",
          duration: 10000,
        });
        setIsCheckingBreach(false);
        return;
      }
    } catch (breachError) {
      // Continue if breach check fails (don't block signup)
      logger.error('Breach check failed:', breachError);
    }
    setIsCheckingBreach(false);

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // Business owners should be redirected to create-business after email verification
          emailRedirectTo: userType === "business"
            ? `${window.location.origin}/create-business`
            : `${window.location.origin}/auth-redirect`,
          // Pass role_type so the handle_new_user trigger knows whether to create
          // a patient profile or a business owner with associated business/dentist records
          data: {
            role_type: userType === "client" ? "patient" : "owner",
          },
        },
      });

      if (error) throw error;

      // Set the business context after successful signup
      const selectedBusinessId = sessionStorage.getItem("selected_business_id");
      if (selectedBusinessId && data.user) {
        try {
          await supabase.functions.invoke('set-current-business', {
            body: { businessId: selectedBusinessId }
          });
          sessionStorage.removeItem('selected_business_id');
        } catch (err) {
          logger.error("Error setting business context:", err);
        }
      }

      // Store email for the alert dialog
      setUserEmail(formData.email);

      // Show success toast
      toast({
        title: "✅ Account created successfully!",
        description: "Please check your email to verify your account.",
        duration: 8000,
        className: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100",
      });

      // Show prominent email verification alert dialog
      setTimeout(() => {
        setShowEmailVerificationAlert(true);
      }, 500);

      // Redirect business owners to create business flow after they close the dialog
      if (userType === "business") {
        // They'll be redirected when they close the alert dialog
        return;
      }
    } catch (signUpError: unknown) {
      const errorMessage = signUpError instanceof Error ? signUpError.message.toLowerCase() : '';
      let userFriendlyMessage = "Unable to create account. Please try again.";

      if (errorMessage.includes("already registered") || errorMessage.includes("already exists")) {
        userFriendlyMessage = "An account with this email already exists. Please sign in instead.";
      } else if (errorMessage.includes("invalid email")) {
        userFriendlyMessage = "The email address you entered doesn't look right. Please check it and try again.";
      } else if (errorMessage.includes("password")) {
        userFriendlyMessage = "Your password needs to be stronger. It must be at least 8 characters long and include both uppercase and lowercase letters.";
      } else if (errorMessage.includes("network")) {
        userFriendlyMessage = "We're having trouble connecting. Please check your internet connection and try again.";
      }

      toast({
        title: "❌ Sign up failed",
        description: userFriendlyMessage,
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Store the user type in sessionStorage so we can retrieve it after OAuth redirect
      // This is needed because OAuth doesn't allow us to pass custom metadata directly
      if (userType) {
        sessionStorage.setItem('pending_signup_user_type', userType === "client" ? "patient" : "owner");
      }

      // Determine redirect based on user type
      const redirectTo = userType === "business"
        ? `${window.location.origin}/create-business`
        : `${window.location.origin}/auth-redirect`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast({
        title: "❌ Google sign up failed",
        description: "Unable to sign up with Google. Please try again or use email/password.",
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
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserType(null)}
                className="mb-4"
              >
                ← Change account type
              </Button>

              <div className="space-y-4">
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
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4" role="form" aria-label="Sign up form">
                  <div className="space-y-2">
                    <Label htmlFor="email">Your Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12"
                      required
                      aria-label="Email address"
                      aria-required="true"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Create Password</Label>
                    <FormField
                      id="password"
                      type="password"
                      placeholder="Minimum 12 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-12"
                      required
                      showPasswordToggle={true}
                      showCharacterCount={false}
                      aria-label="Create password"
                      aria-required="true"
                    />

                    {/* Password Strength Indicator */}
                    {passwordStrength && formData.password && (
                      <div className="space-y-2">
                        <Progress
                          value={(passwordStrength.score / 5) * 100}
                          className="h-2"
                        />
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${getStrengthLabel(passwordStrength.score).color}`}>
                            {getStrengthLabel(passwordStrength.score).label}
                          </span>
                          {isCheckingBreach && (
                            <span className="text-xs text-muted-foreground">Checking security...</span>
                          )}
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <ul className="text-xs text-red-600 space-y-1">
                            {passwordStrength.feedback.slice(0, 3).map((item, i) => (
                              <li key={i}>• {item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      12+ characters with uppercase, lowercase, number, and special character
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <FormField
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="h-12"
                      required
                      showPasswordToggle={true}
                      showCharacterCount={false}
                      validate={(value) => {
                        if (value && formData.password && value !== formData.password) {
                          return "Passwords don't match";
                        }
                        return undefined;
                      }}
                      success={!!(formData.confirmPassword && formData.password && formData.confirmPassword === formData.password)}
                      aria-label="Confirm password"
                      aria-required="true"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-lg font-semibold"
                    disabled={isLoading}
                    aria-label={isLoading ? "Creating your account, please wait" : "Create your account"}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        <span className="sr-only">Creating account...</span>
                      </>
                    ) : (
                      "CREATE ACCOUNT"
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                      Log in
                    </Link>
                  </p>
                </form>

                <p className="text-xs text-center text-muted-foreground pt-4">
                  I agree to the{" "}
                  <Link to="/terms" className="underline hover:text-foreground">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/90 via-purple-500/90 to-pink-500/90" />

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

      {/* Email Verification Alert Dialog */}
      <AlertDialog open={showEmailVerificationAlert} onOpenChange={setShowEmailVerificationAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-blue-100 dark:bg-blue-900/30 rounded-full p-4">
                  <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">
              📧 Check Your Email!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p className="text-base">
                We've sent a verification link to:
              </p>
              <p className="font-semibold text-lg text-foreground bg-muted px-4 py-2 rounded-lg">
                {userEmail}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-left">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Click the verification link in the email to activate your account</span>
                </div>
                <div className="flex items-start gap-2 text-left">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Check your spam/junk folder if you don't see it</span>
                </div>
                <div className="flex items-start gap-2 text-left">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>The link will expire in 24 hours</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Didn't receive the email? Check your spam folder or contact support.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowEmailVerificationAlert(false);
                if (userType === "business") {
                  setTimeout(() => navigate("/create-business"), 300);
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Got it, I'll check my email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* GDPR Consent Dialog - shows different dialog based on user type */}
      {userType === "business" && (
        <DentalPracticeConsentDialog
          open={showConsentDialog}
          onOpenChange={setShowConsentDialog}
          onAccept={(consentData) => {
            setConsentGiven(true);
            // Store consent data in sessionStorage temporarily - will be saved to DB after signup
            sessionStorage.setItem('pending_practice_consent', JSON.stringify(consentData));
            // Now trigger the actual signup
            handleSignUp(new Event('submit') as unknown as React.FormEvent);
          }}
        />
      )}
      {userType === "client" && (
        <PatientTermsConsentDialog
          open={showConsentDialog}
          onOpenChange={setShowConsentDialog}
          onAccept={(consentData) => {
            setConsentGiven(true);
            // Store consent data in sessionStorage temporarily
            sessionStorage.setItem('pending_patient_terms_consent', JSON.stringify(consentData));
            // Now trigger the actual signup
            handleSignUp(new Event('submit') as unknown as React.FormEvent);
          }}
        />
      )}
    </div>
  );
};

export default Signup;
