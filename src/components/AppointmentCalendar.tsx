import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addBusinessContext } from "@/lib/businessScopedSupabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimpleCalendar } from "@/components/SimpleCalendar";
import { DentistSelection } from "@/components/DentistSelection";
import { PatientSelection } from "@/components/PatientSelection";
import { CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { logger } from '@/lib/logger';
import { clinicTimeToUtc, createAppointmentDateTimeFromStrings } from "@/lib/timezone";
interface AppointmentCalendarProps {
  user: User;
  onComplete: (appointmentData?: any) => void;
  onCancel: () => void;
  onBackToDentist?: () => void;
}

export const AppointmentCalendar = ({ user, onComplete, onCancel, onBackToDentist }: AppointmentCalendarProps) => {
  const [step, setStep] = useState<'patient' | 'dentist' | 'datetime' | 'details'>('datetime'); // Start directly at datetime
  const [selectedDentist, setSelectedDentist] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [reasonType, setReasonType] = useState<'checkup' | 'custom'>('checkup');
  const [isForUser, setIsForUser] = useState(true);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Set default reason based on type
  useEffect(() => {
    if (reasonType === 'checkup') {
      setReason('Contrôle de routine');
    } else {
      setReason('');
    }
  }, [reasonType]);

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleBookAppointment = async () => {
    if (!selectedDentist || !selectedDate || !selectedTime) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez compléter toutes les étapes",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Use format to preserve Brussels date without UTC conversion
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Create appointment with proper timezone handling
      // Parse date and time strings as Brussels timezone and convert to UTC
      const appointmentDateTime = createAppointmentDateTimeFromStrings(dateStr, selectedTime);

      // Note: AppointmentCalendar needs business_id - this should be passed as a prop
      // For now, using addBusinessContext which gets it from session
      const appointmentPayload = await addBusinessContext({
        patient_id: profile.id,
        dentist_id: selectedDentist.id,
        appointment_date: appointmentDateTime.toISOString(),
        reason: reason || "Consultation générale",
        status: "confirmed",
        urgency: isEmergency ? "emergency" : "medium",
        is_for_user: isForUser,
        patient_name: isForUser ? null : patientInfo?.name,
        patient_age: isForUser ? null : patientInfo?.age,
        patient_relationship: isForUser ? null : patientInfo?.relationship
      });

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert(appointmentPayload)
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Default duration is 30 minutes for this flow
      const appointmentDuration = 30;

      // Book all required slots for the duration
      const { error: slotError } = await supabase.rpc('book_appointment_slots_for_duration', {
        p_dentist_id: selectedDentist.id,
        p_slot_date: dateStr,
        p_start_time: selectedTime + ':00',
        p_duration_minutes: appointmentDuration,
        p_appointment_id: appointmentData.id
      });

      if (slotError) {
        await supabase.from("appointments").delete().eq("id", appointmentData.id);
        throw new Error("Ce créneau n'est plus disponible");
      }

      toast({
        title: "Rendez-vous confirmé !",
        description: `Rendez-vous pris pour le ${selectedDate.toLocaleDateString('fr-FR')} à ${selectedTime}`,
      });

      onComplete({
        date: selectedDate.toLocaleDateString('fr-FR'),
        time: selectedTime,
        reason: reason || "Consultation générale",
        dentist: `Dr ${selectedDentist.profiles.first_name} ${selectedDentist.profiles.last_name}`,
        isEmergency
      });
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rendez-vous",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'patient':
        return (
          <PatientSelection
            onSelect={(patient) => {
              setPatientInfo(patient);
              setStep('dentist');
            }}
            selectedPatient={patientInfo}
          />
        );

      case 'dentist':
        return (
          <DentistSelection
            onSelectDentist={(dentist: any) => {
              setSelectedDentist(dentist);
              setStep('datetime');
            }}
            selectedDentistId={selectedDentist?.id}
          />
        );

      case 'datetime':
        return (
          <div className="space-y-4">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={onBackToDentist}
              className="flex items-center gap-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la sélection du dentiste
            </Button>
            
            {selectedDentist ? (
              <SimpleCalendar
                selectedDentist={selectedDentist.id}
                onDateTimeSelect={handleDateTimeSelect}
                isEmergency={isEmergency}
              />
            ) : null}
          </div>
        );

      case 'details':
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Détails du rendez-vous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Reason Selection */}
              <div className="space-y-3">
                <Label>Motif de consultation</Label>
                <Select value={reasonType} onValueChange={(value: 'checkup' | 'custom') => setReasonType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisissez le motif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkup">Contrôle de routine</SelectItem>
                    <SelectItem value="custom">Autre (personnalisé)</SelectItem>
                  </SelectContent>
                </Select>
                
                {reasonType === 'custom' && (
                  <Textarea
                    placeholder="Ex: Douleur dentaire, nettoyage, urgence..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Résumé du rendez-vous</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Patient:</strong> {isForUser ? "Vous" : patientInfo?.name}</p>
                  <p><strong>Dentiste:</strong> Dr {selectedDentist?.profiles.first_name} {selectedDentist?.profiles.last_name}</p>
                  <p><strong>Date:</strong> {selectedDate?.toLocaleDateString('fr-FR')}</p>
                  <p><strong>Heure:</strong> {selectedTime}</p>
                  <p><strong>Motif:</strong> {reason || "Contrôle de routine"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 'patient':
        return true; // PatientSelection handles its own validation
      case 'dentist':
        return selectedDentist !== null;
      case 'datetime':
        return selectedDate && selectedTime;
      case 'details':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'patient') return; // Handled by PatientSelection
    if (step === 'dentist') return; // Handled by DentistSelection
    if (step === 'datetime') setStep('details');
    if (step === 'details') handleBookAppointment();
  };

  const handlePrevious = () => {
    if (step === 'dentist') setStep('patient');
    if (step === 'datetime') setStep('dentist');
    if (step === 'details') setStep('datetime');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Progress Indicator - Skip for datetime step */}
        {step !== 'datetime' && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {['patient', 'dentist', 'datetime', 'details'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName 
                      ? 'bg-blue-600 text-white' 
                      : index < ['patient', 'dentist', 'datetime', 'details'].indexOf(step)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index < ['patient', 'dentist', 'datetime', 'details'].indexOf(step) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 3 && <div className="w-8 h-0.5 bg-gray-200 mx-2" />}
                </div>
              ))}
            </div>
            <div className="text-center mt-2 text-sm text-gray-600">
              Étape {['patient', 'dentist', 'datetime', 'details'].indexOf(step) + 1}/4: {
                step === 'details' ? 'Détails' : 
                step === 'patient' ? 'Patient' : 
                'Dentiste'
              }
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons - Hide for datetime step since it has its own back button */}
        {step !== 'patient' && step !== 'dentist' && step !== 'datetime' && (
          <div className="flex justify-between max-w-2xl mx-auto">
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </Button>

            <Button
              onClick={step === 'details' ? handleBookAppointment : handleNext}
              disabled={!canGoNext() || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Confirmation...
                </>
              ) : step === 'details' ? (
                'Confirmer le rendez-vous'
              ) : (
                <>
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};