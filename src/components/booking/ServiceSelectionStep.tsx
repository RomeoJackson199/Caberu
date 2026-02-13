import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Timer,
  Stethoscope,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DentistInfoHeader } from "./DentistInfoHeader";
import type { Dentist, Service, AIBookingData } from "./types";

interface ServiceSelectionStepProps {
  dentist: Dentist | null;
  services: Service[];
  selectedService: Service | null;
  onServiceClick: (service: Service) => void;
  onContinue: (service: Service | null) => void;
  loadingServices: boolean;
  aiBookingData: AIBookingData | null;
  symptomSummary: string;
  onSymptomChange: (value: string) => void;
  isEditingSymptoms: boolean;
  onToggleEditSymptoms: () => void;
  onBack: () => void;
}

export function ServiceSelectionStep({
  dentist,
  services,
  selectedService,
  onServiceClick,
  onContinue,
  loadingServices,
  aiBookingData,
  symptomSummary,
  onSymptomChange,
  isEditingSymptoms,
  onToggleEditSymptoms,
  onBack,
}: ServiceSelectionStepProps) {
  const [showMoreOpen, setShowMoreOpen] = useState(false);

  const sortedServices = useMemo(
    () =>
      [...services].sort((a, b) => {
        if (selectedService?.id === a.id) return -1;
        if (selectedService?.id === b.id) return 1;
        return 0;
      }),
    [services, selectedService]
  );

  const aiRecommendedService = useMemo(() => {
    if (!aiBookingData?.recommendedService) return null;

    const recommendation = aiBookingData.recommendedService.toLowerCase();
    return sortedServices.find(
      (service) =>
        service.name.toLowerCase().includes(recommendation) ||
        recommendation.includes(service.name.toLowerCase())
    );
  }, [aiBookingData?.recommendedService, sortedServices]);

  const featuredService = selectedService || aiRecommendedService;
  const additionalServices = featuredService
    ? sortedServices.filter((service) => service.id !== featuredService.id)
    : sortedServices;

  const renderServiceCard = (service: Service) => {
    const isSelected = selectedService?.id === service.id;
    const isRecommended =
      aiBookingData?.recommendedService &&
      (service.name
        .toLowerCase()
        .includes(aiBookingData.recommendedService.toLowerCase()) ||
        aiBookingData.recommendedService
          .toLowerCase()
          .includes(service.name.toLowerCase()));

    return (
      <Card
        key={service.id}
        className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
          isSelected
            ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
            : "border-border hover:border-indigo-300 dark:hover:border-indigo-700"
        }`}
        onClick={() => {
          onServiceClick(service);
          setShowMoreOpen(false);
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold">{service.name}</h4>
                {isSelected && <CheckCircle className="h-4 w-4 text-indigo-600" />}
                {isRecommended && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    AI Recommended
                  </span>
                )}
              </div>
              {service.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {service.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="font-semibold text-sm text-primary">
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: service.currency || "EUR", minimumFractionDigits: 2 }).format(service.price_cents / 100)}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
              <Timer className="h-3 w-3" />
              {service.duration_minutes || 30} min
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-3 py-4 sm:p-4 sm:py-8">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to reason
      </Button>

      <Card>
        <CardContent className="p-6 space-y-6">
          {dentist && <DentistInfoHeader dentist={dentist} />}

          {/* Service Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-lg">Select a Service</h3>
            </div>

            {loadingServices ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  No services configured yet.
                </p>
                <Button onClick={() => onContinue(null)}>
                  Continue without service
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {featuredService && renderServiceCard(featuredService)}

                {additionalServices.length > 0 && (
                  <Collapsible
                    open={showMoreOpen}
                    onOpenChange={setShowMoreOpen}
                    className="rounded-lg border bg-background"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between rounded-lg p-4 h-auto"
                      >
                        <span className="font-medium">
                          Show {additionalServices.length} more service
                          {additionalServices.length > 1 ? "s" : ""}
                        </span>
                        {showMoreOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {additionalServices.map((service) =>
                          renderServiceCard(service)
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </div>

          {/* Symptom Summary Section */}
          {symptomSummary && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold">Your Symptoms</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleEditSymptoms}
                  className="h-8"
                >
                  {isEditingSymptoms ? (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Done
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This will be shared with your dentist
              </p>
              {isEditingSymptoms ? (
                <Textarea
                  value={symptomSummary}
                  onChange={(e) => onSymptomChange(e.target.value)}
                  placeholder="Describe your symptoms..."
                  className="min-h-[80px]"
                />
              ) : (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  {symptomSummary}
                </div>
              )}
            </div>
          )}

          {/* Continue Button */}
          {selectedService && (
            <Button
              onClick={() => onContinue(selectedService)}
              className="w-full"
              size="lg"
            >
              Continue to Select Dentist
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
