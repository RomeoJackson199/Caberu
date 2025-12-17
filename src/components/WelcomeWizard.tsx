import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Calendar,
  Users,
  Palette,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WelcomeWizardProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function WelcomeWizard({ open, onClose, userId }: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Practice Information
    clinicName: "",
    clinicPhone: "",
    clinicAddress: "",
    clinicCity: "",
    clinicPostalCode: "",

    // Step 2: Schedule Setup
    workingDays: [] as string[],
    startTime: "09:00",
    endTime: "17:00",
    appointmentDuration: 30,

    // Step 3: Services
    primaryServices: [] as string[],

    // Step 4: Branding
    clinicDescription: "",
    primaryColor: "#2563eb",
  });

  const totalSteps = 5;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const steps = [
    {
      title: "Practice Information",
      icon: Building2,
      description: "Tell us about your dental practice",
    },
    {
      title: "Schedule Setup",
      icon: Calendar,
      description: "Set your working hours",
    },
    {
      title: "Services",
      icon: Users,
      description: "What services do you offer?",
    },
    {
      title: "Branding",
      icon: Palette,
      description: "Customize your practice profile",
    },
    {
      title: "All Set!",
      icon: CheckCircle2,
      description: "You're ready to start",
    },
  ];

  const commonServices = [
    "General Checkup",
    "Teeth Cleaning",
    "Fillings",
    "Root Canal",
    "Crowns & Bridges",
    "Teeth Whitening",
    "Orthodontics",
    "Dental Implants",
    "Emergency Care",
  ];

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, business_id")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Build business hours from working days
      const businessHours: Record<string, { open: string; close: string; isOpen: boolean }> = {};
      const dayMapping: Record<string, string> = {
        Monday: "monday",
        Tuesday: "tuesday", 
        Wednesday: "wednesday",
        Thursday: "thursday",
        Friday: "friday",
        Saturday: "saturday",
        Sunday: "sunday",
      };
      
      weekDays.forEach((day) => {
        const key = dayMapping[day];
        businessHours[key] = {
          open: formData.startTime,
          close: formData.endTime,
          isOpen: formData.workingDays.includes(day),
        };
      });

      // Update business with all wizard data
      if (profile.business_id) {
        const fullAddress = [formData.clinicAddress, formData.clinicCity, formData.clinicPostalCode]
          .filter(Boolean)
          .join(", ");

        await supabase
          .from("businesses")
          .update({
            name: formData.clinicName,
            phone: formData.clinicPhone,
            address: fullAddress || null,
            bio: formData.clinicDescription || null,
            business_hours: businessHours,
            custom_config: {
              primaryColor: formData.primaryColor,
              appointmentDuration: formData.appointmentDuration,
            },
          })
          .eq("id", profile.business_id);

        // Create business services from selected services
        if (formData.primaryServices.length > 0) {
          const servicesToInsert = formData.primaryServices.map((serviceName) => ({
            business_id: profile.business_id,
            name: serviceName,
            description: `${serviceName} service`,
            duration_minutes: formData.appointmentDuration,
            price_cents: 0,
            is_active: true,
          }));

          await supabase
            .from("business_services")
            .upsert(servicesToInsert, { onConflict: "business_id,name", ignoreDuplicates: true });
        }
      }

      // Update dentist specialization
      await supabase
        .from("dentists")
        .update({
          specialization: formData.primaryServices[0] || "General Dentistry",
        })
        .eq("profile_id", profile.id);

      // Mark onboarding as completed
      await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
        })
        .eq("id", profile.id);

      toast.success("Welcome setup completed!");
      onClose();
    } catch (error) {
      console.error("Error completing wizard:", error);
      toast.error("Failed to save setup information");
    }
  };

  const toggleService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      primaryServices: prev.primaryServices.includes(service)
        ? prev.primaryServices.filter((s) => s !== service)
        : [...prev.primaryServices, service],
    }));
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        // Practice Information
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="clinicName">Clinic Name *</Label>
              <Input
                id="clinicName"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                placeholder="e.g., Bright Smile Dental"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clinicPhone">Phone Number *</Label>
                <Input
                  id="clinicPhone"
                  type="tel"
                  value={formData.clinicPhone}
                  onChange={(e) => setFormData({ ...formData, clinicPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="clinicAddress">Address</Label>
              <Input
                id="clinicAddress"
                value={formData.clinicAddress}
                onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clinicCity">City</Label>
                <Input
                  id="clinicCity"
                  value={formData.clinicCity}
                  onChange={(e) => setFormData({ ...formData, clinicCity: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div>
                <Label htmlFor="clinicPostalCode">Postal Code</Label>
                <Input
                  id="clinicPostalCode"
                  value={formData.clinicPostalCode}
                  onChange={(e) => setFormData({ ...formData, clinicPostalCode: e.target.value })}
                  placeholder="10001"
                />
              </div>
            </div>
          </div>
        );

      case 1:
        // Schedule Setup
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">Working Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {weekDays.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={formData.workingDays.includes(day) ? "default" : "outline"}
                    onClick={() => toggleDay(day)}
                    className="w-full"
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="appointmentDuration">Default Appointment Duration (minutes)</Label>
              <Input
                id="appointmentDuration"
                type="number"
                value={formData.appointmentDuration}
                onChange={(e) =>
                  setFormData({ ...formData, appointmentDuration: parseInt(e.target.value) })
                }
                min="15"
                max="120"
                step="15"
              />
            </div>
          </div>
        );

      case 2:
        // Services
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Select Services You Offer
              </Label>
              <p className="text-sm text-gray-600 mb-4">
                Choose all that apply. You can add more services later.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {commonServices.map((service) => (
                  <Button
                    key={service}
                    type="button"
                    variant={formData.primaryServices.includes(service) ? "default" : "outline"}
                    onClick={() => toggleService(service)}
                    className="w-full text-left justify-start"
                    size="sm"
                  >
                    {service}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        // Branding
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="clinicDescription">Clinic Description</Label>
              <Textarea
                id="clinicDescription"
                value={formData.clinicDescription}
                onChange={(e) => setFormData({ ...formData, clinicDescription: e.target.value })}
                placeholder="Tell patients about your practice..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="primaryColor">Primary Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        // Completion
        return (
          <div className="text-center space-y-6 py-8">
            <div className="inline-flex p-4 rounded-full bg-green-100">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h3>
              <p className="text-gray-600">
                Your practice is configured and ready to go. You can always update these settings
                later in your dashboard.
              </p>
            </div>

            <Card className="p-6 bg-blue-50 border-blue-200 text-left">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Quick Next Steps:
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ Invite your staff members</li>
                <li>✓ Set up your availability calendar</li>
                <li>✓ Add your services and pricing</li>
                <li>✓ Import existing patient records</li>
                <li>✓ Customize your booking page</li>
              </ul>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.clinicName.trim() !== "" && formData.clinicPhone.trim() !== "";
      case 1:
        return formData.workingDays.length > 0;
      case 2:
        return formData.primaryServices.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-blue-100">
              {steps[currentStep] && (() => {
                const StepIcon = steps[currentStep].icon;
                return <StepIcon className="h-8 w-8 text-blue-600" />;
              })()}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{steps[currentStep]?.title}</h2>
            <p className="text-gray-600">{steps[currentStep]?.description}</p>
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">{renderStep()}</div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="gap-2 bg-green-600 hover:bg-green-700">
                Complete Setup
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
