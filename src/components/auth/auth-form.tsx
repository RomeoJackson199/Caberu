import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { sanitizeFormData, validateDentalFormData, ClientRateLimit } from "@/lib/security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Shield
} from "lucide-react";
import { AccountClaimFlow } from "@/components/AccountClaimFlow";
import { analytics, ANALYTICS_EVENTS } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";

interface AuthFormProps {
  compact?: boolean;
  onSuccess?: () => void;
  showNextParam?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  compact = false,
  onSuccess,
  showNextParam = true
}) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showClaimFlow, setShowClaimFlow] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();

  // Rate limiting
  const rateLimit = new ClientRateLimit(5, 15 * 60 * 1000);

  // Check URL params for next redirect
  useEffect(() => {
    if (showNextParam) {
      const urlParams = new URLSearchParams(window.location.search);
      const next = urlParams.get('next');
      if (next) {
        localStorage.setItem('auth_redirect', next);
      }
    }
  }, [showNextParam]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawData = {
      ...formData,
      [e.target.name]: e.target.value,
    };

    const sanitizedData = sanitizeFormData(rawData);
    setFormData(sanitizedData);
    setValidationErrors([]);

    // Check password strength
    if (e.target.name === 'password') {
      setPasswordStrength(calculatePasswordStrength(e.target.value));
    }
  };

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 2) return 'bg-red-500';
    if (passwordStrength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 2) return 'Weak';
    if (passwordStrength < 4) return 'Medium';
    return 'Strong';
  };

  const checkExistingProfile = async (email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .is('user_id', null)
      .single();

    return data && !error ? data : null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await analytics.track(ANALYTICS_EVENTS.AUTH_SIGNUP, { method: 'email' });

      if (!rateLimit.isAllowed(formData.email)) {
        throw new Error(`Too many attempts. Please wait ${Math.ceil(rateLimit.getRemainingAttempts(formData.email) / 60)} minutes.`);
      }

      const validation = validateDentalFormData(formData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        throw new Error(validation.errors[0]);
      }

      if (!acceptTerms || !healthConsent) {
        throw new Error('Please accept the terms and privacy policy to continue.');
      }

      const existingProfile = await checkExistingProfile(formData.email);
      if (existingProfile) {
        setExistingProfile(existingProfile);
        setShowClaimFlow(true);
        setIsLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/auth-redirect`;

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            health_data_consent: true,
            health_data_consent_at: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        rateLimit.reset(formData.email);

        try {
          await analytics.track(ANALYTICS_EVENTS.AUTH_LOGIN, { method: 'email' });

          if (!rateLimit.isAllowed(formData.email)) {
            throw new Error(`Too many sign-in attempts. Please wait ${Math.ceil(rateLimit.getRemainingAttempts(formData.email) / 60)} minutes.`);
          }

          const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (error) throw error;

          rateLimit.reset(formData.email);

          toast({
            title: t.signInSuccess,
            description: t.welcomeToCaberu,
          });

          // Handle redirect
          const redirectTo = localStorage.getItem('auth_redirect');
          if (redirectTo) {
            localStorage.removeItem('auth_redirect');
            window.location.href = redirectTo;
            return;
          }

          if (onSuccess) onSuccess();
          if (compact) setShowLoginDialog(false);
        } catch (error: unknown) {
          await analytics.track('auth_login_failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            method: 'email'
          });

          toast({
            title: t.signInError,
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await analytics.track(ANALYTICS_EVENTS.AUTH_LOGIN, { method: 'email' });

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: t.signInSuccess,
        description: t.welcomeToCaberu,
      });

      // Handle redirect
      const redirectTo = localStorage.getItem('auth_redirect');
      if (redirectTo) {
        localStorage.removeItem('auth_redirect');
        window.location.href = redirectTo;
        return;
      }

      if (onSuccess) onSuccess();
      if (compact) setShowLoginDialog(false);
    } catch (error: any) {
      await analytics.track('auth_login_failed', {
        error: error.message,
        method: 'email'
      });

      const errorMessage = error.message === "Invalid login credentials"
        ? "Sorry password or email incorrect"
        : error.message;

      toast({
        title: t.signInError,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await analytics.track(ANALYTICS_EVENTS.AUTH_GOOGLE_LOGIN);

      if (formData.email) {
        const existingProfile = await checkExistingProfile(formData.email);
        if (existingProfile) {
          toast({
            title: "Profile Found",
            description: `We found your profile from clinic records. Please use the claim flow instead.`,
            variant: "default",
          });
          setExistingProfile(existingProfile);
          setShowClaimFlow(true);
          setIsLoading(false);
          return;
        }
      }

      const redirectUrl = `${window.location.origin}/auth-redirect`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      await analytics.track('auth_google_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: t.signInError,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (showClaimFlow && existingProfile) {
    return (
      <AccountClaimFlow
        email={formData.email}
        existingProfile={existingProfile}
        onBack={() => {
          setShowClaimFlow(false);
          setExistingProfile(null);
        }}
        onSuccess={() => {
          setShowClaimFlow(false);
          setExistingProfile(null);
          if (onSuccess) onSuccess();
          if (compact) setShowLoginDialog(false);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-elegant glass-card border border-border/20">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <CardHeader className="text-center space-y-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="signin"
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white transition-all duration-200"
              >
                {t.signIn}
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white transition-all duration-200"
              >
                {t.signUp}
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="signin" className="space-y-4 mt-6">
              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full border-2 border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50 text-gray-700 h-12"
              >
                {
                  isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg >
                  )}
                Continue with Google
              </Button >

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder={t.enterEmail}
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 h-12"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.enterPassword}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10 h-12"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validationErrors[0]}
                    </AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.signInButton}
                </Button>

                <div className="text-center">
                  <a
                    href={`/claim?email=${encodeURIComponent(formData.email)}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Check if I'm registered at this clinic
                  </a>
                </div>
              </form>
            </TabsContent >

            <TabsContent value="signup" className="space-y-4 mt-6">
              {/* Google Sign Up */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full border-2 border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50 text-gray-700 h-12"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Sign up with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or sign up with email</span>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstName">{t.firstName}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-firstName"
                        name="firstName"
                        placeholder={t.firstName}
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="pl-10 h-12"
                        required
                        autoComplete="given-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastName">{t.lastName}</Label>
                    <Input
                      id="signup-lastName"
                      name="lastName"
                      placeholder={t.lastName}
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="h-12"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder={t.enterEmail}
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 h-12"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.enterPassword}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10 h-12"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span>Password strength:</span>
                        <span className={cn(
                          "font-medium",
                          passwordStrength < 2 ? 'text-red-600' : passwordStrength < 4 ? 'text-yellow-600' : 'text-green-600'
                        )}>
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            getPasswordStrengthColor()
                          )}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">{t.phone} ({t.optional})</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-10 h-12"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                      className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t.acceptTerms}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        By creating an account, you agree to our{" "}
                        <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                          Privacy Policy
                        </a>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="health-consent"
                      checked={healthConsent}
                      onCheckedChange={(checked) => setHealthConsent(checked === true)}
                      className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="health-consent"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Health Data Consent
                      </label>
                      <p className="text-xs text-muted-foreground">
                        I consent to the processing of my health data for dental care services as described in our privacy policy.
                      </p>
                    </div>
                  </div>
                </div>

                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validationErrors[0]}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={isLoading || !acceptTerms || !healthConsent || passwordStrength < 2}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.createAccount}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <ForgotPasswordDialog
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
        defaultEmail={formData.email}
      />
    </div>
  );
};