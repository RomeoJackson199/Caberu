import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  FileText,
  DollarSign,
  Calendar,
  ArrowRight,
  ArrowLeft,
  User,
  Clock,
  Pill,
  ClipboardList as ClipboardListIcon,
  Plus,
  Trash2,
  Camera
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { NotificationService } from '@/lib/notificationService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessTemplate } from '@/hooks/useBusinessTemplate';
import { logger } from '@/lib/logger';
import { ImagingUploader } from '@/components/imaging/ImagingUploader';
import { ImagingGallery } from '@/components/imaging/ImagingGallery';

interface AppointmentCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    patient_id: string;
    dentist_id: string;
    appointment_date: string;
    reason?: string;
    patient?: {
      first_name: string;
      last_name: string;
      email?: string;
    };
  };
  onCompleted: () => void;
}

interface Treatment {
  id: string;
  name: string;
  tooth?: string;
  price: number;
}

// Dynamic steps by template
const allStepMeta: Record<string, { title: string; icon: any }> = {
  overview: { title: 'Overview', icon: User },
  treatments: { title: 'Treatments', icon: FileText },
  services: { title: 'Treatments Provided', icon: FileText },
  notes: { title: 'Notes', icon: FileText },
  imaging: { title: 'Imaging', icon: Camera },
  prescriptions: { title: 'Prescriptions', icon: Pill },
  'treatment-plan': { title: 'Treatment Plan', icon: ClipboardListIcon },
  billing: { title: 'Billing', icon: DollarSign },
  complete: { title: 'Complete', icon: CheckCircle2 },
} as const;

export function AppointmentCompletionDialog({
  open,
  onOpenChange,
  appointment,
  onCompleted
}: AppointmentCompletionDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Template-driven behavior
  const { template, hasFeature } = useBusinessTemplate();
  const steps = useMemo(() => {
    const defs = template?.completionSteps?.filter(s => s.enabled) ?? [
      { id: 'overview', title: 'Overview' },
      { id: 'treatments', title: 'Treatments' },
      { id: 'notes', title: 'Notes' },
      { id: 'billing', title: 'Billing' },
      { id: 'complete', title: 'Complete' },
    ];
    return defs.map(d => ({ id: d.id as any, title: (allStepMeta[d.id]?.title ?? d.title), icon: (allStepMeta[d.id]?.icon ?? FileText) }));
  }, [template]);
  const showToothInput = template?.id === 'healthcare' || !!template?.features?.medicalRecords;
  const serviceLabel = template?.terminology?.service || 'Treatment';
  const serviceLabelPlural = template?.terminology?.servicePlural || 'Treatments';
  // Form data
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [notes, setNotes] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Array<{
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<string | null>(null);
  const [linkToTreatmentPlan, setLinkToTreatmentPlan] = useState(false);
  const [createNewTreatmentPlan, setCreateNewTreatmentPlan] = useState(false);
  const [newTreatmentPlanForm, setNewTreatmentPlanForm] = useState({
    title: '',
    description: '',
    diagnosis: '',
    priority: 'normal',
    estimated_cost: '',
    estimated_duration_weeks: ''
  });
  const [uploadedImagingSetId, setUploadedImagingSetId] = useState<string | null>(null);
  const [imagingCount, setImagingCount] = useState(0);

  // Fetch treatment plans on mount
  useEffect(() => {
    const fetchTreatmentPlans = async () => {
      const { data } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', appointment.patient_id)
        .eq('dentist_id', appointment.dentist_id)
        .eq('status', 'active');

      if (data) {
        setTreatmentPlans(data);
      }
    };

    if (open) {
      fetchTreatmentPlans();
    }
  }, [open, appointment]);

  // Auto-enable treatment plan link if plans available
  useEffect(() => {
    if (open && treatmentPlans.length > 0) {
      setLinkToTreatmentPlan(true);
    }
  }, [open, treatmentPlans.length]);

  // Calculated values
  const totalAmount = treatments.reduce((sum, treatment) => sum + treatment.price, 0);
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Fetch services from DB
  const [dbServices, setDbServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('business_services')
        .select('name, price_cents')
        .eq('is_active', true);

      if (data) {
        setDbServices(data);
      }
    };

    fetchServices();
  }, []);

  const addTreatment = (treatment: { name: string; price: number; tooth?: string }) => {
    const newTreatment: Treatment = {
      id: Math.random().toString(36).substr(2, 9),
      name: treatment.name,
      tooth: treatment.tooth,
      price: treatment.price
    };
    setTreatments(prev => [...prev, newTreatment]);
  };

  // Quick add treatments based on fetched services
  const quickTreatments = dbServices.map(s => ({
    name: s.name,
    price: s.price_cents / 100
  }));

  const addCustomTreatment = () => {
    const name = prompt('Service name:');
    const priceStr = prompt('Price (€):');
    if (name && priceStr) {
      const price = parseFloat(priceStr);
      if (!isNaN(price)) {
        addTreatment({ name, price });
      }
    }
  };

  const removeTreatment = (id: string) => {
    setTreatments(prev => prev.filter(t => t.id !== id));
  };

  const updateTreatmentPrice = (id: string, newPrice: number) => {
    setTreatments(prev => prev.map(t =>
      t.id === id ? { ...t, price: newPrice } : t
    ));
  };

  const updateTreatmentTooth = (id: string, tooth: string) => {
    setTreatments(prev => prev.map(t =>
      t.id === id ? { ...t, tooth } : t
    ));
  };

  const addPrescription = () => {
    setPrescriptions(prev => [...prev, {
      id: `rx-${Date.now()}`,
      medication: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    }]);
  };

  const updatePrescription = (id: string, field: string, value: string) => {
    setPrescriptions(prev => prev.map(rx =>
      rx.id === id ? { ...rx, [field]: value } : rx
    ));
  };

  const removePrescription = (id: string) => {
    setPrescriptions(prev => prev.filter(rx => rx.id !== id));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    // Capture all form data before closing
    const formData = {
      treatments: [...treatments],
      notes,
      consultationNotes,
      paymentReceived,
      prescriptions: [...prescriptions],
      followUpNeeded,
      followUpDate,
      selectedTreatmentPlan,
      createNewTreatmentPlan,
      newTreatmentPlanForm: { ...newTreatmentPlanForm },
      totalAmount
    };

    // Immediately close dialog and show success toast
    toast({
      title: "Appointment completed",
      description: "Processing details in background...",
    });

    onCompleted();
    onOpenChange(false);
    setLoading(false);

    // Process everything in background (fire and forget)
    processCompletionInBackground(formData).catch(error => {
      console.error('Background processing failed:', error);
      toast({
        title: "Some details may not have saved",
        description: "Please check the appointment and try again if needed.",
        variant: "destructive",
      });
    });
  };

  // Background processing function
  const processCompletionInBackground = async (formData: {
    treatments: typeof treatments;
    notes: string;
    consultationNotes: string;
    paymentReceived: boolean;
    prescriptions: typeof prescriptions;
    followUpNeeded: boolean;
    followUpDate: string;
    selectedTreatmentPlan: string | null;
    createNewTreatmentPlan: boolean;
    newTreatmentPlanForm: typeof newTreatmentPlanForm;
    totalAmount: number;
  }) => {
    try {
      // Generate AI reason (non-blocking, optional)
      let aiGeneratedReason = appointment.reason;
      try {
        const { data: reasonData } = await supabase.functions.invoke(
          'appointment-ai-assistant',
          {
            body: {
              action: 'generate_reason',
              appointmentData: {
                consultation_notes: formData.consultationNotes || formData.notes,
                notes: formData.notes,
                treatments: formData.treatments,
              },
            },
          }
        );
        if (reasonData?.reason) {
          aiGeneratedReason = reasonData.reason;
        }
      } catch (error) {
        console.error('AI reason generation failed:', error);
      }

      // 1. Save treatment records as notes
      if (formData.treatments.length > 0) {
        const treatmentNotes = formData.treatments.map(treatment =>
          `Service: ${treatment.name}${treatment.tooth ? ` (Tooth: ${treatment.tooth})` : ''} - €${treatment.price.toFixed(2)}`
        ).join('\n');

        await supabase.from('notes').insert({
          patient_id: appointment.patient_id,
          title: `Appointment Services - ${format(new Date(appointment.appointment_date), 'PPP')}`,
          content: treatmentNotes,
          note_type: 'treatment',
          created_by: appointment.dentist_id
        });
      }

      // 2. Save consultation notes
      if (formData.notes.trim() || formData.consultationNotes.trim()) {
        await supabase.from('notes').insert({
          patient_id: appointment.patient_id,
          title: `Consultation Notes - ${format(new Date(appointment.appointment_date), 'PPP')}`,
          content: formData.consultationNotes.trim() || formData.notes.trim(),
          note_type: 'consultation',
          created_by: appointment.dentist_id
        });
      }

      // 3. Create invoice if payment received, or payment request if not
      if (formData.totalAmount > 0) {
        if (formData.paymentReceived) {
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
              appointment_id: appointment.id,
              patient_id: appointment.patient_id,
              dentist_id: appointment.dentist_id,
              total_amount_cents: Math.round(formData.totalAmount * 100),
              patient_amount_cents: Math.round(formData.totalAmount * 100),
              mutuality_amount_cents: 0,
              vat_amount_cents: 0,
              status: 'paid',
              claim_status: 'to_be_submitted'
            })
            .select()
            .single();

          if (!invoiceError && invoice) {
            const invoiceItems = formData.treatments.map(treatment => ({
              invoice_id: invoice.id,
              code: `SERV-${treatment.name.replace(/\s+/g, '-').toUpperCase()}`,
              description: treatment.name,
              quantity: 1,
              tariff_cents: Math.round(treatment.price * 100),
              mutuality_cents: 0,
              patient_cents: Math.round(treatment.price * 100),
              vat_cents: 0
            }));

            if (invoiceItems.length > 0) {
              await supabase.from('invoice_items').insert(invoiceItems);
            }
          }
        } else {
          // Payment not received - create payment request
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('id', appointment.patient_id)
            .single();

          if (patientProfile?.email) {
            const treatmentDescription = formData.treatments.map(t =>
              `${t.name}${t.tooth ? ` (Tooth ${t.tooth})` : ''}`
            ).join(', ');

            await supabase.functions.invoke('create-payment-request', {
              body: {
                patient_id: appointment.patient_id,
                dentist_id: appointment.dentist_id,
                amount: Math.round(formData.totalAmount * 100),
                description: `Appointment on ${format(new Date(appointment.appointment_date), 'PPP')} - ${treatmentDescription}`,
                patient_email: patientProfile.email,
                send_now: true,
                channels: ['email'],
                action_url: '/patient/billing?tab=unpaid'
              }
            });
          }
        }
      }

      // 4. Save prescriptions
      if (formData.prescriptions.length > 0) {
        const prescriptionData = formData.prescriptions.map(rx => ({
          patient_id: appointment.patient_id,
          dentist_id: appointment.dentist_id,
          medication_name: rx.medication,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          instructions: rx.instructions,
          prescribed_date: new Date().toISOString(),
          status: 'active'
        }));

        await supabase.from('prescriptions').insert(prescriptionData);
      }

      // 5. Create new treatment plan or link to existing one
      let treatmentPlanId = formData.selectedTreatmentPlan;

      if (formData.createNewTreatmentPlan && formData.newTreatmentPlanForm.title.trim()) {
        const { data: newPlan } = await supabase
          .from('treatment_plans')
          .insert({
            patient_id: appointment.patient_id,
            dentist_id: appointment.dentist_id,
            title: formData.newTreatmentPlanForm.title,
            description: formData.newTreatmentPlanForm.description || null,
            diagnosis: formData.newTreatmentPlanForm.diagnosis || null,
            priority: formData.newTreatmentPlanForm.priority,
            estimated_cost: formData.newTreatmentPlanForm.estimated_cost ? parseFloat(formData.newTreatmentPlanForm.estimated_cost) : null,
            estimated_duration_weeks: formData.newTreatmentPlanForm.estimated_duration_weeks ? parseInt(formData.newTreatmentPlanForm.estimated_duration_weeks) : null,
            status: 'active',
            start_date: new Date().toISOString()
          })
          .select()
          .single();

        if (newPlan) {
          treatmentPlanId = newPlan.id;
        }
      }

      // 6. Update appointment status
      await supabase
        .from('appointments')
        .update({
          status: 'completed',
          reason: aiGeneratedReason,
          consultation_notes: formData.consultationNotes || formData.notes || null,
          treatment_plan_id: treatmentPlanId || null
        })
        .eq('id', appointment.id);

      // 7. Schedule follow-up if needed
      if (formData.followUpNeeded && formData.followUpDate) {
        const { createAppointmentWithNotification } = await import('@/hooks/useAppointments');
        await createAppointmentWithNotification({
          patient_id: appointment.patient_id,
          dentist_id: appointment.dentist_id,
          appointment_date: new Date(formData.followUpDate).toISOString(),
          reason: 'Follow-up appointment',
          status: 'confirmed',
          duration_minutes: 30
        });
      }

      // 8. Send email notification
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .eq('id', appointment.patient_id)
        .single();

      if (patientProfile?.user_id && patientProfile?.email) {
        const appointmentDateObj = new Date(appointment.appointment_date);
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Appointment Completed</h2>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Appointment Details</h3>
              <p><strong>Date:</strong> ${format(appointmentDateObj, 'PPP')}</p>
              <p><strong>Time:</strong> ${format(appointmentDateObj, 'p')}</p>
              ${appointment.dentist?.first_name && appointment.dentist?.last_name ? `<p><strong>Dentist:</strong> ${appointment.dentist.first_name} ${appointment.dentist.last_name}</p>` : ''}
            </div>

            ${formData.treatments.length > 0 ? `
              <div style="margin: 20px 0;">
                <h3 style="color: #333;">Services Provided</h3>
                <ul>
                  ${formData.treatments.map(t => `<li>${t.name}${t.tooth ? ` (Tooth ${t.tooth})` : ''} - €${t.price.toFixed(2)}</li>`).join('')}
                </ul>
                <p><strong>Total: €${formData.totalAmount.toFixed(2)}</strong></p>
              </div>
            ` : ''}

            ${formData.prescriptions.length > 0 ? `
              <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #1565c0; margin-top: 0;">💊 Prescriptions</h4>
                <ul>
                  ${formData.prescriptions.map(rx => `<li><strong>${rx.medication}</strong> - ${rx.dosage}, ${rx.frequency}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${formData.followUpNeeded && formData.followUpDate ? `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #856404; margin-top: 0;">📅 Follow-up Scheduled</h4>
                <p style="color: #856404; margin: 0;">A follow-up appointment has been scheduled for ${format(new Date(formData.followUpDate), 'PPP p')}.</p>
              </div>
            ` : ''}

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 30px; border-top: 1px solid #e5e5e5;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                Thank you for your visit! If you have any questions about your treatment or need to schedule another appointment, 
                please don't hesitate to contact our office.
              </p>
            </div>
          </div>
        `;

        await NotificationService.sendEmailNotification(
          patientProfile.user_id,
          'Appointment Completed - Service Summary',
          emailContent,
          'appointment',
          true,
          {
            email: patientProfile.email,
            dentistId: appointment.dentist_id,
            appointmentId: appointment.id,
            isSystemNotification: false,
            appointmentDate: format(appointmentDateObj, 'EEEE, MMMM d, yyyy'),
            appointmentTime: format(appointmentDateObj, 'HH:mm')
          }
        );
      }

    } catch (error) {
      console.error('Background processing error:', error);
      throw error; // Re-throw to trigger error toast
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-6 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">
                    {appointment.patient?.first_name} {appointment.patient?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.patient?.email || 'No email provided'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-base">
                      {format(new Date(appointment.appointment_date), 'EEEE, MMMM do, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(appointment.appointment_date), 'h:mm a')}
                    </p>
                  </div>
                </div>

                {appointment.reason && (
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-base">Reason for visit</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'services':
      case 'treatments':
        return (
          <div className="space-y-4">
            {/* Quick treatments */}
            <div>
              <Label className="text-base font-semibold">Quick Add {serviceLabelPlural}</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {quickTreatments.map((treatment) => (
                  <Button
                    key={treatment.name}
                    variant="outline"
                    size="sm"
                    onClick={() => addTreatment(treatment)}
                    className="justify-start text-left h-auto p-3"
                  >
                    <div>
                      <p className="font-medium">{treatment.name}</p>
                      <p className="text-xs text-muted-foreground">€{treatment.price}</p>
                    </div>
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomTreatment}
                className="mt-2 w-full"
              >
                + Custom {serviceLabel}
              </Button>
            </div>

            {/* Selected treatments */}
            {treatments.length > 0 && (
              <div>
                <Label className="text-base font-semibold">Selected {serviceLabelPlural}</Label>
                <div className="space-y-2 mt-2">
                  {treatments.map((treatment) => (
                    <Card key={treatment.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-2">
                            <p className="font-medium">{treatment.name}</p>
                            <div className="flex gap-2">
                              {showToothInput && (
                                <Input
                                  placeholder="Tooth (e.g., 16)"
                                  value={treatment.tooth || ''}
                                  onChange={(e) => updateTreatmentTooth(treatment.id, e.target.value)}
                                  className="w-24"
                                />
                              )}
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Price"
                                value={treatment.price}
                                onChange={(e) => updateTreatmentPrice(treatment.id, parseFloat(e.target.value) || 0)}
                                className="w-24"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTreatment(treatment.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="mt-4 bg-primary/5">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount</span>
                      <span className="text-lg font-bold text-primary">
                        €{totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="consultation-notes" className="text-base font-semibold">
                Clinical Notes
              </Label>
              <Textarea
                id="consultation-notes"
                placeholder="Record clinical findings, treatment details, patient response..."
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                className="mt-2 min-h-24"
              />
            </div>

            <div>
              <Label htmlFor="general-notes" className="text-base font-semibold">
                Additional Notes
              </Label>
              <Textarea
                id="general-notes"
                placeholder="Any additional observations or comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-20"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="follow-up"
                checked={followUpNeeded}
                onChange={(e) => setFollowUpNeeded(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="follow-up">Schedule follow-up appointment</Label>
            </div>

            {followUpNeeded && (
              <div>
                <Label htmlFor="follow-up-date">Follow-up Date</Label>
                <Input
                  id="follow-up-date"
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      case 'prescriptions':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Prescriptions</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addPrescription}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Prescription
              </Button>
            </div>

            {prescriptions.length === 0 ? (
              <Card className="p-8 text-center bg-muted/30">
                <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No prescriptions added</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Click "Add Prescription" to prescribe medication</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((rx) => (
                  <Card key={rx.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Medication Details</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePrescription(rx.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`rx-medication-${rx.id}`}>Medication Name</Label>
                          <Input
                            id={`rx-medication-${rx.id}`}
                            placeholder="e.g., Amoxicillin"
                            value={rx.medication}
                            onChange={(e) => updatePrescription(rx.id, 'medication', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rx-dosage-${rx.id}`}>Dosage</Label>
                          <Input
                            id={`rx-dosage-${rx.id}`}
                            placeholder="e.g., 500mg"
                            value={rx.dosage}
                            onChange={(e) => updatePrescription(rx.id, 'dosage', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rx-frequency-${rx.id}`}>Frequency</Label>
                          <Input
                            id={`rx-frequency-${rx.id}`}
                            placeholder="e.g., 3 times daily"
                            value={rx.frequency}
                            onChange={(e) => updatePrescription(rx.id, 'frequency', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rx-duration-${rx.id}`}>Duration</Label>
                          <Input
                            id={`rx-duration-${rx.id}`}
                            placeholder="e.g., 7 days"
                            value={rx.duration}
                            onChange={(e) => updatePrescription(rx.id, 'duration', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor={`rx-instructions-${rx.id}`}>Special Instructions</Label>
                          <Input
                            id={`rx-instructions-${rx.id}`}
                            placeholder="e.g., Take with food"
                            value={rx.instructions}
                            onChange={(e) => updatePrescription(rx.id, 'instructions', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'treatment-plan':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Treatment Plan</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="create-new-plan"
                    checked={createNewTreatmentPlan}
                    onChange={(e) => {
                      setCreateNewTreatmentPlan(e.target.checked);
                      if (e.target.checked) {
                        setLinkToTreatmentPlan(false);
                        setSelectedTreatmentPlan(null);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="create-new-plan">Create New Plan</Label>
                </div>
              </div>

              {createNewTreatmentPlan ? (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label htmlFor="plan-title">Plan Title</Label>
                      <Input
                        id="plan-title"
                        placeholder="e.g., Comprehensive Restoration"
                        value={newTreatmentPlanForm.title}
                        onChange={(e) => setNewTreatmentPlanForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-diagnosis">Diagnosis</Label>
                      <Textarea
                        id="plan-diagnosis"
                        placeholder="Primary diagnosis..."
                        value={newTreatmentPlanForm.diagnosis}
                        onChange={(e) => setNewTreatmentPlanForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="plan-cost">Est. Cost (€)</Label>
                        <Input
                          id="plan-cost"
                          type="number"
                          placeholder="0.00"
                          value={newTreatmentPlanForm.estimated_cost}
                          onChange={(e) => setNewTreatmentPlanForm(prev => ({ ...prev, estimated_cost: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="plan-duration">Est. Weeks</Label>
                        <Input
                          id="plan-duration"
                          type="number"
                          placeholder="0"
                          value={newTreatmentPlanForm.estimated_duration_weeks}
                          onChange={(e) => setNewTreatmentPlanForm(prev => ({ ...prev, estimated_duration_weeks: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="link-plan"
                      checked={linkToTreatmentPlan}
                      onChange={(e) => setLinkToTreatmentPlan(e.target.checked)}
                      disabled={treatmentPlans.length === 0}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="link-plan">Link to Existing Plan</Label>
                  </div>

                  {linkToTreatmentPlan && (
                    <Select
                      value={selectedTreatmentPlan || ''}
                      onValueChange={setSelectedTreatmentPlan}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a treatment plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {treatmentPlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.title} ({format(new Date(plan.created_at), 'MMM d, yyyy')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount</span>
                  <span>€{totalAmount.toFixed(2)}</span>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="payment-received"
                      checked={paymentReceived}
                      onChange={(e) => setPaymentReceived(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="payment-received">Payment Received Now</Label>
                  </div>

                  {!paymentReceived && totalAmount > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-200">Payment Request</p>
                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                          A payment request will be automatically sent to the patient via email.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'imaging':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Appointment Imaging
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload X-rays, photos, or scans from this visit
              </p>
            </div>

            <ImagingUploader
              patientId={appointment.patient_id}
              appointmentId={appointment.id}
              onUploadComplete={() => setImagingCount(prev => prev + 1)}
            />

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Images from this appointment</h4>
              <ImagingGallery
                patientId={appointment.patient_id}
                appointmentId={appointment.id}
                onImagingCountChange={setImagingCount}
                showHeader={false}
                compact
              />
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Ready to Complete</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Review the summary below before finalizing the appointment.
              </p>
            </div>

            <Card className="text-left max-w-md mx-auto">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Services:</span>
                  <span className="font-medium">{treatments.length} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">€{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className={`font-medium ${paymentReceived ? 'text-green-600' : 'text-orange-600'}`}>
                    {paymentReceived ? 'Received' : 'Request to be sent'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Follow-up:</span>
                  <span className="font-medium">{followUpNeeded ? 'Scheduled' : 'Not needed'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prescriptions:</span>
                  <span className="font-medium">{prescriptions.length} items</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Appointment – {steps[currentStep].title}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="py-6 min-h-[300px]">
          {renderStepContent()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 || loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Completing...' : 'Complete Appointment'}
              {!loading && <CheckCircle2 className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}