import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, User, Calendar, ArrowRight, ArrowLeft, MapPin, Shield,
  Sparkles, Heart, Bell, Phone, CheckCircle2, MessageSquare, Globe
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateName } from "@/lib/security";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { SUPPORTED_LANGUAGES, Language } from "@/lib/translations";
import { cn } from "@/lib/utils";

type OnboardingStep = 'personal' | 'phone' | 'address';
type AuthProvider = 'phone' | 'email' | 'google' | 'unknown';

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal');
  const [userId, setUserId] = useState<string | null>(null);
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    phoneVerified: false,
    address: "",
    postalCode: "",
    city: "",
    enable2FA: false,
    preferredLanguage: "en" as Language,
  });

  const steps: { id: OnboardingStep; title: string; description: string }[] = [
    { id: 'personal', title: 'Personal Info', description: 'Tell us about yourself' },
    { id: 'phone', title: 'Phone Verification', description: 'Verify your phone number' },
    { id: 'address', title: 'Finish Setup', description: 'Complete your profile' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.id);

      // Detect auth provider — if phone, skip phone verification step
      const authProvider: AuthProvider = user.app_metadata?.provider === 'phone' 
        ? 'phone' 
        : user.app_metadata?.provider === 'google' 
          ? 'google' 
          : user.app_metadata?.provider === 'email' 
            ? 'email' 
            : 'unknown';

      // Check if profile is already complete
      const { data: profile } = await supabase
        .from("secure_profiles_view")
        .select("first_name, last_name, date_of_birth, phone, address, phone_verified, onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (profile?.onboarding_completed && profile?.first_name && profile?.last_name && profile?.date_of_birth) {
        navigate("/select-business");
        return;
      }

      // Pre-fill form if some data exists
      if (profile) {
        // If user signed up via phone, their phone is already verified
        const isPhoneAlreadyVerified = profile.phone_verified || authProvider === 'phone';
        
        setFormData(prev => ({
          ...prev,
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          dateOfBirth: profile.date_of_birth || "",
          phone: profile.phone || user.phone || "",
          phoneVerified: isPhoneAlreadyVerified,
          address: profile.address || "",
        }));

        // If phone is already verified (e.g. phone signup), mark it in DB if not already
        if (authProvider === 'phone' && !profile.phone_verified && user.phone) {
          await supabase
            .from("profiles")
            .update({ 
              phone: user.phone, 
              phone_verified: true, 
              phone_verified_at: new Date().toISOString() 
            })
            .eq("user_id", user.id);
        }
      }
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handlePersonalInfoNext = () => {
    // Validation
    if (!validateName(formData.firstName)) {
      toast({
        title: "Invalid name",
        description: "First name contains invalid characters",
        variant: "destructive",
      });
      return;
    }
    if (!validateName(formData.lastName)) {
      toast({
        title: "Invalid name",
        description: "Last name contains invalid characters",
        variant: "destructive",
      });
      return;
    }
    if (!formData.dateOfBirth) {
      toast({
        title: "Missing information",
        description: "Date of birth is required",
        variant: "destructive",
      });
      return;
    }

    // Skip phone step if phone is already verified (e.g. signed up via phone)
    if (formData.phoneVerified) {
      setCurrentStep('address');
    } else {
      setCurrentStep('phone');
    }
  };

  const formatPhoneNumber = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  const sendVerificationCode = async () => {
    if (resendCooldown > 0) {
      toast({
        title: "Please Wait",
        description: `You can resend the code in ${resendCooldown} seconds`,
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(formData.phone);

    if (!formattedPhone || formattedPhone.length < 8) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number with country code (e.g., +32467881965)",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: { phoneNumber: formattedPhone }
      });

      if (error) throw error;

      setPhoneVerificationSent(true);
      setMaskedPhone(data.maskedPhone || formattedPhone);

      // Start 60-second cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast({
        title: "Verification Code Sent",
        description: "Check your phone for the 6-digit SMS code",
      });
    } catch (error: unknown) {
      console.error('Error sending SMS code:', error);
      let message = "Failed to send verification code";
      if (error && typeof error === 'object' && 'context' in error) {
        try {
          const body = await (error as { context: Response }).context.json();
          message = body.error || body.message || message;
        } catch { /* ignore */ }
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length < 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter the code from your SMS",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(formData.phone);

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: { phoneNumber: formattedPhone, code: verificationCode, userId }
      });

      if (error) throw error;

      if (data?.verified) {
        setFormData(prev => ({ ...prev, phoneVerified: true }));
        toast({
          title: "Phone Verified!",
          description: "Your phone number has been verified successfully",
        });
        // Move to next step after short delay
        setTimeout(() => setCurrentStep('address'), 500);
      } else {
        toast({
          title: "Invalid Code",
          description: data?.error || "The verification code you entered is incorrect",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('Error verifying SMS code:', error);
      let message = "Failed to verify code";
      if (error && typeof error === 'object' && 'context' in error) {
        try {
          const body = await (error as { context: Response }).context.json();
          message = body.error || body.message || message;
        } catch { /* ignore */ }
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Combine address fields
      const fullAddress = formData.address
        ? `${formData.address}, ${formData.postalCode} ${formData.city}`.trim()
        : "";

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          phone: formData.phone || null,
          address: fullAddress || null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Apply language preference immediately
      localStorage.setItem("preferred-language", formData.preferredLanguage);
      document.documentElement.lang = formData.preferredLanguage;
      window.dispatchEvent(new CustomEvent("language:changed", { detail: formData.preferredLanguage }));

      toast({
        title: "Welcome to Caberu!",
        description: "Your profile is complete. Now select a practice to get started!",
      });

      navigate("/select-business");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Header skeleton */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted animate-pulse rounded-2xl" />
            <div className="space-y-2">
              <div className="h-8 w-64 mx-auto bg-muted animate-pulse rounded" />
              <div className="h-4 w-80 mx-auto bg-muted animate-pulse rounded" />
            </div>
          </div>
          {/* Form skeleton */}
          <div className="bg-white border rounded-xl p-6 shadow-lg space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-full bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
            <div className="h-12 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Caberu!</h1>
            <p className="text-muted-foreground mt-2">
              {steps[currentStepIndex].description}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  index < currentStepIndex
                    ? "bg-green-500 text-white"
                    : index === currentStepIndex
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-1 mx-1 rounded transition-all",
                    index < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Feature highlights - only show on first step */}
        {currentStep === 'personal' && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white/80 rounded-lg text-center border shadow-sm">
              <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-medium">Easy Booking</p>
            </div>
            <div className="p-3 bg-white/80 rounded-lg text-center border shadow-sm">
              <Bell className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs font-medium">Reminders</p>
            </div>
            <div className="p-3 bg-white/80 rounded-lg text-center border shadow-sm">
              <Heart className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-xs font-medium">Health Records</p>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-xl p-6 shadow-lg">
          {/* Step 1: Personal Info */}
          {currentStep === 'personal' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="pl-10"
                      placeholder="Jan"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Peeters"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="pl-10"
                    required
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredLanguage" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Preferred Language
                </Label>
                <Select
                  value={formData.preferredLanguage}
                  onValueChange={(value) => setFormData({ ...formData, preferredLanguage: value as Language })}
                >
                  <SelectTrigger id="preferredLanguage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handlePersonalInfoNext}
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step 2: Phone Verification */}
          {currentStep === 'phone' && (
            <div className="space-y-5">
              {/* Info Banner */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">Why verify your phone?</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Your phone number allows you to talk to our AI assistant for booking appointments and getting help.
                      You can also receive appointment reminders via SMS.
                    </p>
                  </div>
                </div>
              </div>

              {!phoneVerificationSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneNumberInput
                      value={formData.phone}
                      onChange={(val) => setFormData({ ...formData, phone: val || "" })}
                      placeholder="Enter phone number"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send a verification code to this number
                    </p>
                  </div>

                  <Button
                    onClick={sendVerificationCode}
                    disabled={isVerifying || !formData.phone || formData.phone.length < 8}
                    className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Phone className="mr-2 h-5 w-5" />
                        Send Verification Code
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">SMS sent to</p>
                      <p className="text-sm text-muted-foreground">{maskedPhone}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      maxLength={8}
                      className="text-center text-2xl tracking-widest h-14"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={sendVerificationCode}
                      disabled={isVerifying || resendCooldown > 0}
                      className="flex-1"
                    >
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                    </Button>
                    <Button
                      onClick={verifyCode}
                      disabled={isVerifying || verificationCode.length < 4}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </>
              )}

              <Button
                variant="ghost"
                onClick={() => setCurrentStep('personal')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          )}

          {/* Step 3: Address & Finish */}
          {currentStep === 'address' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {formData.phoneVerified && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">Phone number verified</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="pl-10"
                    placeholder="Street and number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Brussels"
                  />
                </div>
              </div>

              {/* 2FA Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-blue-50/50">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <Label className="font-medium cursor-pointer">Enable Two-Factor Authentication</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add extra security to your account
                  </p>
                </div>
                <Switch
                  checked={formData.enable2FA}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable2FA: checked })}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep('phone')}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Complete Profile
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Your data is secure and GDPR compliant
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
