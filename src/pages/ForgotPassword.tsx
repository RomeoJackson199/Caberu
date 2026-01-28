import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Shield, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";
import { validatePassword } from "@/utils/passwordValidation";
import { AuthSplitLayout, AuthCard, SubmitButton, FormSection } from "@/components/ui/layout-components";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'verify' | 'success'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: { email, type: 'recovery' }
      });

      if (error) throw error;

      toast({
        title: "Code Sent",
        description: "Please check your email for the reset code",
      });
      setStep('verify');
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword) return;

    // SECURITY: Validate password strength before reset
    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.isValid) {
      toast({
        title: "Weak Password",
        description: passwordResult.feedback.join(". "),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('reset-password-with-code', {
        body: { email, code, newPassword }
      });

      if (error) throw error;

      setStep('success');
      toast({
        title: "Password Reset",
        description: "Your password has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const heroContent = (
    <div className="max-w-md space-y-6 text-center">
      <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto backdrop-blur-sm">
        <Shield className="h-10 w-10" />
      </div>
      <h2 className="text-4xl font-bold leading-tight">
        {step === 'email' && "Forgot your password?"}
        {step === 'verify' && "Verify & Reset"}
        {step === 'success' && "All Set!"}
      </h2>
      <p className="text-lg text-white/90">
        {step === 'email' && "Enter your email address and we'll send you a code to reset your password."}
        {step === 'verify' && "Enter the verification code sent to your email and choose a new password."}
        {step === 'success' && "Your password has been securely updated. You can now log in."}
      </p>
    </div>
  );

  const formContent = (
    <div className="space-y-6">
      {step === 'email' && (
        <>
          <div className="lg:hidden text-center space-y-2">
            <h1 className="text-2xl font-bold">Forgot password?</h1>
            <p className="text-muted-foreground">Enter your email to receive a reset code</p>
          </div>

          <AuthCard>
            <form onSubmit={handleSendCode} className="space-y-4" role="form" aria-label="Password reset request form">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                        required
                        autoFocus
                        autoComplete="email"
                        aria-label="Email address"
                        aria-required="true"
                      />
                    </div>
                  </div>

              <SubmitButton isLoading={isLoading} loadingText="Sending...">
                Send Reset Code
              </SubmitButton>
            </form>
          </AuthCard>
        </>
      )}

      {step === 'verify' && (
        <>
          <div className="lg:hidden text-center space-y-2">
            <h1 className="text-2xl font-bold">Verify & Reset</h1>
            <p className="text-muted-foreground">Check your email for the code</p>
          </div>

          <AuthCard>
            <form onSubmit={handleResetPassword} className="space-y-4" role="form" aria-label="Password reset verification form">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      placeholder="6-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center tracking-widest text-lg h-12"
                      maxLength={6}
                      required
                      autoFocus
                      aria-label="6-digit verification code"
                      aria-required="true"
                      aria-describedby="code-hint"
                    />
                    <p id="code-hint" className="text-xs text-muted-foreground text-center">
                      Sent to {email}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <FormField
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12"
                      required
                      showPasswordToggle={true}
                      showCharacterCount={false}
                      hint="Minimum 12 characters with uppercase, lowercase, number, and special character"
                      aria-label="New password"
                      aria-required="true"
                    />
              </div>

              <SubmitButton isLoading={isLoading} loadingText="Resetting...">
                Reset Password
              </SubmitButton>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('email')}
                disabled={isLoading}
                aria-label="Go back to email entry"
              >
                Back to Email
              </Button>
            </form>
          </AuthCard>
        </>
      )}

      {step === 'success' && (
        <AuthCard className="p-8 text-center">
          <div className="space-y-6">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Password Reset!</h2>
              <p className="text-muted-foreground">
                Your password has been successfully updated. You can now access your account.
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full h-12 text-base font-semibold">
                Return to Sign In
              </Button>
            </Link>
          </div>
        </AuthCard>
      )}

      {step !== 'success' && (
        <div className="text-center">
          <Link to="/login">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <AuthSplitLayout
      formSide="right"
      formContent={formContent}
      heroContent={heroContent}
    />
  );
};

export default ForgotPassword;
