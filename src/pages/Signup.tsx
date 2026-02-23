import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, validators } from "@/components/ui/form-field";
import { Loader2, Calendar, MessageSquare, FileText, Sparkles, Mail, CheckCircle2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';
import { PhoneOTPAuth } from "@/components/auth/PhoneOTPAuth";
import { SignupFormWithPhone } from "@/components/auth/SignupFormWithPhone";
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
        userFriendlyMessage = "An account with this email already exists. If you originally used Google or Apple, sign in with that provider and then link your email/password in Account Settings.";
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
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast({
        title: "❌ Apple sign up failed",
        description: "Unable to sign up with Apple. Please try again or use another method.",
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
              handleSignUp={handleSignUp}
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              passwordStrength={passwordStrength}
              isCheckingBreach={isCheckingBreach}
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
