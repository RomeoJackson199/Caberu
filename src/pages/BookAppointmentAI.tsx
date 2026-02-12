import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessSelectionForPatients } from "@/components/shared/BusinessPicker";
import { AppointmentSuccessDialog } from "@/components/AppointmentSuccessDialog";
import { AppointmentErrorBoundary } from "@/components/stability/AppointmentErrorBoundary";
import { OfflineBanner } from "@/components/stability/OfflineIndicator";
import {
  useBookingFlow,
  DentistSelectionStep,
  SymptomsStep,
  ServiceSelectionStep,
  DateTimeSelectionStep,
  ConfirmationStep,
} from "@/components/booking";

function BookAppointmentContent() {
  const booking = useBookingFlow();

  if (booking.businessLoading || booking.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4">
        <div className="max-w-6xl mx-auto space-y-6 py-8">
          <Skeleton className="h-12 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!booking.businessId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Select a Clinic</h2>
              <p className="text-muted-foreground mb-6">
                Please select a clinic to view available dentists and book an
                appointment.
              </p>
              <BusinessSelectionForPatients
                onSelectBusiness={(id: string) => booking.switchBusiness(id)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <AppointmentSuccessDialog
        open={booking.showSuccessDialog}
        onOpenChange={booking.handleSuccessDialogChange}
        appointmentDetails={booking.successDetails}
      />

      {booking.bookingStep === "symptoms" && (
        <SymptomsStep
          dentist={null}
          symptomSummary={booking.symptomSummary}
          onSymptomChange={booking.setSymptomSummary}
          onNext={booking.handleSymptomsNext}
          onBack={undefined}
        />
      )}

      {booking.bookingStep === "service" && (
        <ServiceSelectionStep
          dentist={null}
          services={booking.services}
          selectedService={booking.selectedService}
          onServiceClick={(service) => booking.setSelectedService(service)}
          onContinue={booking.handleServiceSelect}
          loadingServices={booking.loadingServices}
          aiBookingData={booking.aiBookingData}
          symptomSummary={booking.symptomSummary}
          onSymptomChange={booking.setSymptomSummary}
          isEditingSymptoms={booking.isEditingSymptoms}
          onToggleEditSymptoms={() =>
            booking.setIsEditingSymptoms(!booking.isEditingSymptoms)
          }
          onBack={() => booking.setBookingStep("symptoms")}
        />
      )}

      {booking.bookingStep === "dentist" && (
        <DentistSelectionStep
          dentists={booking.dentists}
          onSelect={booking.handleDentistSelect}
          onBack={() => booking.setBookingStep("service")}
        />
      )}

      {booking.bookingStep === "datetime" && booking.selectedDentist && (
        <DateTimeSelectionStep
          dentist={booking.selectedDentist}
          selectedDate={booking.selectedDate}
          currentWeekStart={booking.currentWeekStart}
          selectedTime={booking.selectedTime}
          availableSlots={booking.availableSlots}
          loadingSlots={booking.loadingSlots}
          isDateDisabled={booking.isDateDisabled}
          onDateSelect={booking.handleDateSelect}
          onTimeSelect={booking.handleTimeSelect}
          onNavigateWeek={booking.navigateWeek}
          onBack={() => booking.setBookingStep("dentist")}
        />
      )}

      {booking.bookingStep === "confirm" &&
        booking.selectedDentist &&
        booking.selectedDate &&
        booking.selectedTime && (
          <ConfirmationStep
            dentist={booking.selectedDentist}
            selectedDate={booking.selectedDate}
            selectedTime={booking.selectedTime}
            isBooking={booking.isBooking}
            selectedService={booking.selectedService}
            onConfirm={booking.confirmBooking}
            onBack={() => {
              booking.setBookingStep("datetime");
              if (booking.selectedDate && booking.selectedDentist) {
                booking.fetchAvailableSlots(
                  booking.selectedDate,
                  booking.selectedDentist.id
                );
              }
            }}
          />
        )}
    </div>
  );
}

// Wrap with error boundary for better stability
export default function BookAppointment() {
  return (
    <AppointmentErrorBoundary context="booking">
      <OfflineBanner />
      <BookAppointmentContent />
    </AppointmentErrorBoundary>
  );
}
