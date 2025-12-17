import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Calendar,
  Users,
  Settings,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Clock,
  MapPin,
  Briefcase,
  Shield,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DentistOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface OnboardingData {
  // Personal Info (prefilled)
  firstName: string;
  lastName: string;
  dateOfBirth: string;

  // Step 1: Welcome & Role Confirmation
  role: "dentist" | "hygienist" | "admin" | "receptionist";

  // Step 2: Practice Information
  practiceName: string;
  practiceType: "solo" | "group" | "corporate" | "other";
  specialty: string;

  // Step 3: Contact & Location (Belgium-friendly)
  practiceAddress: string;
  practiceCity: string;
  practicePostalCode: string;
  practicePhone: string;
  practiceEmail: string;

  // Step 4: Working Hours
  mondayOpen: string;
  mondayClose: string;
  mondayEnabled: boolean;
  tuesdayOpen: string;
  tuesdayClose: string;
  tuesdayEnabled: boolean;
  wednesdayOpen: string;
  wednesdayClose: string;
  wednesdayEnabled: boolean;
  thursdayOpen: string;
  thursdayClose: string;
  thursdayEnabled: boolean;
  fridayOpen: string;
  fridayClose: string;
  fridayEnabled: boolean;
  saturdayOpen: string;
  saturdayClose: string;
  saturdayEnabled: boolean;
  sundayOpen: string;
  sundayClose: string;
  sundayEnabled: boolean;

  // Step 5: Services & Goals
  primaryServices: string[];
  mainGoals: string[];

  // Step 7: Security Settings
  enable2FA: boolean;
  requireApproval: boolean;
}

export const DentistOnboardingFlow = ({ isOpen, onClose, userId }: DentistOnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  const [data, setData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    role: "dentist",
    practiceName: "",
    practiceType: "solo",
    specialty: "General Dentistry",
    practiceAddress: "",
    practiceCity: "",
    practicePostalCode: "",
    practicePhone: "",
    practiceEmail: "",
    mondayOpen: "09:00",
    mondayClose: "17:00",
    mondayEnabled: true,
    tuesdayOpen: "09:00",
    tuesdayClose: "17:00",
    tuesdayEnabled: true,
    wednesdayOpen: "09:00",
    wednesdayClose: "17:00",
    wednesdayEnabled: true,
    thursdayOpen: "09:00",
    thursdayClose: "17:00",
    thursdayEnabled: true,
    fridayOpen: "09:00",
    fridayClose: "17:00",
    fridayEnabled: true,
    saturdayOpen: "09:00",
    saturdayClose: "13:00",
    saturdayEnabled: false,
    sundayOpen: "09:00",
    sundayClose: "13:00",
    sundayEnabled: false,
    primaryServices: [],
    mainGoals: [],
    enable2FA: false,
    requireApproval: false,
  });

  // Fetch existing profile data on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, date_of_birth, phone, email, address")
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        if (profile) {
          // Parse address if it exists (format: "street, postalcode city")
          let streetAddress = "";
          let postalCode = "";
          let city = "";
          
          if (profile.address) {
            const parts = profile.address.split(", ");
            if (parts.length >= 2) {
              streetAddress = parts[0];
              const cityParts = parts[1].split(" ");
              postalCode = cityParts[0] || "";
              city = cityParts.slice(1).join(" ") || "";
            } else {
              streetAddress = profile.address;
            }
          }

          setData(prev => ({
            ...prev,
            firstName: profile.first_name || "",
            lastName: profile.last_name || "",
            dateOfBirth: profile.date_of_birth || "",
            practicePhone: profile.phone || "",
            practiceEmail: profile.email || "",
            practiceAddress: streetAddress,
            practicePostalCode: postalCode,
            practiceCity: city,
            // Set practice name from dentist name if available
            practiceName: profile.first_name && profile.last_name 
              ? `Dr. ${profile.first_name} ${profile.last_name}` 
              : "",
          }));
        }
      } catch (error) {
        console.error("Error in fetchProfileData:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    if (isOpen && userId) {
      fetchProfileData();
    }
  }, [isOpen, userId]);

  const totalSteps = 7;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const updateData = (field: string, value: any) => {
    setData({ ...data, [field]: value });
  };

  const toggleArrayItem = (field: "primaryServices" | "mainGoals", value: string) => {
    const current = data[field];
    if (current.includes(value)) {
      updateData(field, current.filter((item) => item !== value));
    } else {
      updateData(field, [...current, value]);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Get current profile with business_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Build business hours object
      const businessHours: Record<string, { open: string; close: string; isOpen: boolean }> = {
        monday: { open: data.mondayOpen, close: data.mondayClose, isOpen: data.mondayEnabled },
        tuesday: { open: data.tuesdayOpen, close: data.tuesdayClose, isOpen: data.tuesdayEnabled },
        wednesday: { open: data.wednesdayOpen, close: data.wednesdayClose, isOpen: data.wednesdayEnabled },
        thursday: { open: data.thursdayOpen, close: data.thursdayClose, isOpen: data.thursdayEnabled },
        friday: { open: data.fridayOpen, close: data.fridayClose, isOpen: data.fridayEnabled },
        saturday: { open: data.saturdayOpen, close: data.saturdayClose, isOpen: data.saturdayEnabled },
        sunday: { open: data.sundayOpen, close: data.sundayClose, isOpen: data.sundayEnabled },
      };

      const fullAddress = `${data.practiceAddress}, ${data.practicePostalCode} ${data.practiceCity}`;

      // Update profile with onboarding data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          role: 'dentist',
          first_name: data.firstName,
          last_name: data.lastName,
          date_of_birth: data.dateOfBirth,
          phone: data.practicePhone,
          address: fullAddress,
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Update business record if exists
      if (profile.business_id) {
        const { error: businessError } = await supabase
          .from('businesses')
          .update({
            name: data.practiceName,
            phone: data.practicePhone,
            address: fullAddress,
            business_hours: businessHours,
          })
          .eq('id', profile.business_id);

        if (businessError) {
          console.error('Business update error:', businessError);
        }
      }

      // Create or update dentist record
      const { data: existingDentist } = await supabase
        .from('dentists')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      const dentistPayload = {
        profile_id: profile.id,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.practiceEmail,
        specialization: data.specialty,
        clinic_address: fullAddress,
        is_active: true,
        require_appointment_approval: data.requireApproval,
      };

      if (existingDentist) {
        await supabase
          .from('dentists')
          .update(dentistPayload)
          .eq('id', existingDentist.id);
      } else {
        await supabase
          .from('dentists')
          .insert(dentistPayload);
      }

      toast({
        title: "Welcome to Caberu!",
        description: "Your account has been set up successfully.",
      });

      onClose();
      window.location.reload(); // Refresh to apply new role
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete setup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    // Step 0: Welcome & Personal Info
    {
      title: "Welcome to Caberu!",
      description: "Let's set up your dental practice in just a few minutes",
      icon: Sparkles,
      content: (
        <div className="space-y-6 py-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Welcome to Caberu!</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                We're excited to help you manage your dental practice more efficiently.
                This quick setup will take about 3-5 minutes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-semibold text-sm mb-1">Smart Scheduling</h4>
              <p className="text-xs text-gray-600">AI-powered appointment management</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 mb-2" />
              <h4 className="font-semibold text-sm mb-1">Patient Records</h4>
              <p className="text-xs text-gray-600">Complete digital health records</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600 mb-2" />
              <h4 className="font-semibold text-sm mb-1">Billing & Payments</h4>
              <p className="text-xs text-gray-600">Streamlined revenue management</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <Settings className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="font-semibold text-sm mb-1">Practice Analytics</h4>
              <p className="text-xs text-gray-600">Insights to grow your practice</p>
            </div>
          </div>

          {/* Personal Info Fields */}
          <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium">Your Personal Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={data.firstName}
                  onChange={(e) => updateData("firstName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={data.lastName}
                  onChange={(e) => updateData("lastName", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={data.dateOfBirth}
                onChange={(e) => updateData("dateOfBirth", e.target.value)}
                className="mt-1"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>What's your role?</Label>
            <Select value={data.role} onValueChange={(value: any) => updateData("role", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dentist">Dentist/Owner</SelectItem>
                <SelectItem value="hygienist">Dental Hygienist</SelectItem>
                <SelectItem value="admin">Practice Manager/Admin</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },

    // Step 1: Practice Information
    {
      title: "Practice Information",
      description: "Tell us about your dental practice",
      icon: Building2,
      content: (
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="practiceName">Practice Name *</Label>
            <Input
              id="practiceName"
              placeholder="e.g., Bright Smiles Dental"
              value={data.practiceName}
              onChange={(e) => updateData("practiceName", e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="practiceType">Practice Type *</Label>
            <Select value={data.practiceType} onValueChange={(value) => updateData("practiceType", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo Practice</SelectItem>
                <SelectItem value="group">Group Practice</SelectItem>
                <SelectItem value="corporate">Corporate Practice</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="specialty">Primary Specialty *</Label>
            <Select value={data.specialty} onValueChange={(value) => updateData("specialty", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General Dentistry">General Dentistry</SelectItem>
                <SelectItem value="Orthodontics">Orthodontics</SelectItem>
                <SelectItem value="Periodontics">Periodontics</SelectItem>
                <SelectItem value="Endodontics">Endodontics</SelectItem>
                <SelectItem value="Oral Surgery">Oral Surgery</SelectItem>
                <SelectItem value="Pediatric Dentistry">Pediatric Dentistry</SelectItem>
                <SelectItem value="Prosthodontics">Prosthodontics</SelectItem>
                <SelectItem value="Cosmetic Dentistry">Cosmetic Dentistry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },

    // Step 2: Location & Contact
    {
      title: "Location & Contact",
      description: "Where can patients find you?",
      icon: MapPin,
      content: (
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="practiceAddress">Street Address *</Label>
            <Input
              id="practiceAddress"
              placeholder="123 Main Street"
              value={data.practiceAddress}
              onChange={(e) => updateData("practiceAddress", e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="practiceCity">City *</Label>
              <Input
                id="practiceCity"
                placeholder="City"
                value={data.practiceCity}
                onChange={(e) => updateData("practiceCity", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="practicePostalCode">Postal Code *</Label>
              <Input
                id="practicePostalCode"
                placeholder="1000"
                value={data.practicePostalCode}
                onChange={(e) => updateData("practicePostalCode", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="practicePhone">Phone Number *</Label>
              <div className="mt-1">
                <PhoneNumberInput
                  value={data.practicePhone}
                  onChange={(val) => updateData("practicePhone", val || "")}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="practiceEmail">Email *</Label>
              <Input
                id="practiceEmail"
                type="email"
                placeholder="info@practice.com"
                value={data.practiceEmail}
                onChange={(e) => updateData("practiceEmail", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      ),
    },

    // Step 3: Working Hours
    {
      title: "Working Hours",
      description: "When is your practice open?",
      icon: Clock,
      content: (
        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {[
            { day: "Monday", key: "monday" },
            { day: "Tuesday", key: "tuesday" },
            { day: "Wednesday", key: "wednesday" },
            { day: "Thursday", key: "thursday" },
            { day: "Friday", key: "friday" },
            { day: "Saturday", key: "saturday" },
            { day: "Sunday", key: "sunday" },
          ].map(({ day, key }) => (
            <div key={day} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <Switch
                checked={data[`${key}Enabled` as keyof OnboardingData] as boolean}
                onCheckedChange={(checked) => updateData(`${key}Enabled`, checked)}
              />
              <Label className="w-24 text-sm font-medium">{day}</Label>
              {data[`${key}Enabled` as keyof OnboardingData] ? (
                <>
                  <Input
                    type="time"
                    value={data[`${key}Open` as keyof OnboardingData] as string}
                    onChange={(e) => updateData(`${key}Open`, e.target.value)}
                    className="w-28"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="time"
                    value={data[`${key}Close` as keyof OnboardingData] as string}
                    onChange={(e) => updateData(`${key}Close`, e.target.value)}
                    className="w-28"
                  />
                </>
              ) : (
                <span className="text-gray-400 text-sm">Closed</span>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-4">
            💡 Tip: Toggle the switch to mark days as open or closed
          </p>
        </div>
      ),
    },

    // Step 4: Services Offered
    {
      title: "Services Offered",
      description: "What services do you provide?",
      icon: Briefcase,
      content: (
        <div className="space-y-4 py-4">
          <Label>Select all that apply:</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              "General Checkups",
              "Teeth Cleaning",
              "Fillings",
              "Root Canals",
              "Crowns & Bridges",
              "Dental Implants",
              "Teeth Whitening",
              "Invisalign/Braces",
              "Veneers",
              "Emergency Care",
              "Pediatric Dentistry",
              "Oral Surgery",
            ].map((service) => (
              <Button
                key={service}
                type="button"
                variant={data.primaryServices.includes(service) ? "default" : "outline"}
                className={`justify-start h-auto py-3 ${
                  data.primaryServices.includes(service)
                    ? "bg-blue-600 text-white"
                    : ""
                }`}
                onClick={() => toggleArrayItem("primaryServices", service)}
              >
                {service}
              </Button>
            ))}
          </div>
        </div>
      ),
    },

    // Step 5: Goals
    {
      title: "Your Goals",
      description: "What do you want to achieve with Caberu?",
      icon: Settings,
      content: (
        <div className="space-y-4 py-4">
          <Label>Select your top priorities:</Label>
          <div className="grid grid-cols-1 gap-3">
            {[
              "Reduce no-shows",
              "Automate appointment reminders",
              "Streamline patient intake",
              "Improve patient communication",
              "Better revenue management",
              "Grow patient base",
              "Reduce administrative work",
              "GDPR compliance",
            ].map((goal) => (
              <Button
                key={goal}
                type="button"
                variant={data.mainGoals.includes(goal) ? "default" : "outline"}
                className={`justify-start h-auto py-3 ${
                  data.mainGoals.includes(goal)
                    ? "bg-purple-600 text-white"
                    : ""
                }`}
                onClick={() => toggleArrayItem("mainGoals", goal)}
              >
                {goal}
              </Button>
            ))}
          </div>
        </div>
      ),
    },

    // Step 6: Security & Completion
    {
      title: "Security & Preferences",
      description: "Final settings before you get started",
      icon: Shield,
      content: (
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-blue-50">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <Label className="font-medium cursor-pointer">Enable Two-Factor Authentication</Label>
              </div>
              <p className="text-xs text-gray-600">
                Add extra security to your account (recommended)
              </p>
            </div>
            <Switch
              checked={data.enable2FA}
              onCheckedChange={(checked) => updateData("enable2FA", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <Label className="font-medium cursor-pointer">Require Appointment Approval</Label>
              </div>
              <p className="text-xs text-gray-600">
                Review and approve appointment requests before confirming
              </p>
            </div>
            <Switch
              checked={data.requireApproval}
              onCheckedChange={(checked) => updateData("requireApproval", checked)}
            />
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg mt-6 border border-blue-200">
            <h4 className="font-semibold text-lg mb-2 text-blue-900">🎉 You're all set!</h4>
            <p className="text-sm text-gray-700 mb-4">
              Click "Complete Setup" to start using Caberu. We'll guide you through the platform
              with interactive tutorials tailored to your goals.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Your data is secure and GDPR compliant</span>
            </div>
          </div>
        </div>
      ),
    },
  ];


  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !!data.role && !!data.firstName && !!data.lastName && !!data.dateOfBirth;
      case 1:
        return data.practiceName && data.practiceType && data.specialty;
      case 2:
        return data.practiceAddress && data.practiceCity && data.practicePostalCode &&
          data.practicePhone && data.practiceEmail;
      default:
        return true;
    }
  };

  if (initialLoading) {
    return (
      <Dialog open={isOpen}>
        <DialogContent className="max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle>{currentStepData.title}</DialogTitle>
              <DialogDescription>{currentStepData.description}</DialogDescription>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="mt-4">
          {currentStepData.content}
        </div>

        <div className="flex justify-between items-center pt-4 border-t mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!isStepValid() || loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            {loading ? (
              "Saving..."
            ) : currentStep === totalSteps - 1 ? (
              <>
                Complete Setup
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
