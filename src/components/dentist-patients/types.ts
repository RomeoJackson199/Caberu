// Patient management types - centralized type definitions

export interface DentistPatient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  medical_history?: string;
  emergency_contact?: string;
  profile_picture_url?: string | null;
}

export interface PatientAppointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  business_id: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  reason?: string;
  notes?: string;
  consultation_notes?: string;
  treatment_plan_id?: string;
  amount_paid_cents?: number | null;
  payment_status?: string;
  completed_at?: string;
}

export interface PatientFlags {
  hasUnpaidBalance: boolean;
  outstandingCents?: number;
  hasUpcomingAppointment: boolean;
  hasActiveTreatmentPlan: boolean;
  lastVisitDate?: string;
  nextAppointmentDate?: string;
  totalAppointments: number;
  completedAppointments: number;
}

export interface ConsultationContext {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  startedAt: string;
}

// Appointment grouping for timeline
export type AppointmentGroup = 'upcoming' | 'needs_completion' | 'finalized';

export function getAppointmentGroup(appointment: PatientAppointment): AppointmentGroup {
  const now = new Date();
  const appointmentDate = new Date(appointment.appointment_date);
  
  if (appointment.status === 'cancelled') {
    return 'finalized';
  }
  
  if (appointment.status === 'completed' && appointment.completed_at) {
    return 'finalized';
  }
  
  // Past but not completed = needs completion
  if (appointmentDate < now && appointment.status !== 'completed') {
    return 'needs_completion';
  }
  
  // Future = upcoming
  if (appointmentDate >= now) {
    return 'upcoming';
  }
  
  return 'finalized';
}
