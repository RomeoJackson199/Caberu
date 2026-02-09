/**
 * Centralized patient-related type definitions
 * All patient types should be imported from this file
 */

// ============================================================================
// Core Patient Types
// ============================================================================

/**
 * Base patient profile information
 */
export interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    address?: string;
    street_address?: string;
    house_number?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    medical_history?: string;
    emergency_contact?: string;
    profile_picture_url?: string | null;
    avatar_url?: string;
    created_at?: string;
}

/**
 * Extended patient type with appointment statistics
 * Used in patient lists and dashboards
 */
export interface PatientWithStats extends Patient {
    last_appointment?: string;
    total_appointments: number;
    upcoming_appointments: number;
}

/**
 * Patient list item for virtualized lists
 */
export type PatientListItem = Pick<
    Patient,
    'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'date_of_birth' | 'avatar_url' | 'medical_history' | 'created_at'
>;

// ============================================================================
// Patient Flags & Status
// ============================================================================

/**
 * Patient status flags for quick reference in lists
 */
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

/**
 * Patient with preloaded flags
 */
export interface PatientWithFlags extends Patient {
    flags?: PatientFlags;
}

// ============================================================================
// Appointment Types
// ============================================================================

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type AppointmentUrgency = 'low' | 'medium' | 'high' | 'emergency';

/**
 * Basic appointment information
 */
export interface Appointment {
    id: string;
    appointment_date: string;
    duration_minutes: number;
    status: AppointmentStatus | string;
    urgency: AppointmentUrgency | string;
    reason?: string;
    consultation_notes?: string;
}

/**
 * Full patient appointment with all fields
 */
export interface PatientAppointment {
    id: string;
    patient_id: string;
    dentist_id: string;
    business_id: string;
    appointment_date: string;
    duration_minutes: number;
    status: AppointmentStatus;
    urgency: AppointmentUrgency;
    reason?: string;
    notes?: string;
    consultation_notes?: string;
    treatment_plan_id?: string;
    amount_paid_cents?: number | null;
    payment_status?: string;
    completed_at?: string;
    ai_summary?: string;
    booking_source?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Appointment grouping for timeline views
 */
export type AppointmentGroup = 'upcoming' | 'needs_completion' | 'completed' | 'cancelled';

/**
 * Determine which group an appointment belongs to
 */
export function getAppointmentGroup(appointment: PatientAppointment): AppointmentGroup {
    const now = new Date();
    const appointmentDate = new Date(appointment.appointment_date);

    if (appointment.status === 'cancelled') {
        return 'cancelled';
    }

    if (appointment.status === 'completed') {
        return 'completed';
    }

    // Past but not completed = needs completion
    if (appointmentDate < now) {
        return 'needs_completion';
    }

    return 'upcoming';
}

// ============================================================================
// Treatment Plan Types
// ============================================================================

export type TreatmentPlanStatus = 'active' | 'completed' | 'cancelled' | 'pending';
export type TreatmentPlanPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Treatment plan information
 */
export interface TreatmentPlan {
    id: string;
    patient_id?: string;
    dentist_id?: string;
    title: string;
    description?: string;
    diagnosis?: string;
    status: TreatmentPlanStatus | string;
    priority: TreatmentPlanPriority | string;
    estimated_cost?: number;
    estimated_duration_weeks?: number;
    start_date?: string;
    end_date?: string;
    notes?: string;
    treatment_goals?: string[];
    procedures?: string[];
    created_at: string;
    updated_at?: string;
}

// ============================================================================
// Prescription Types
// ============================================================================

export type PrescriptionStatus = 'active' | 'completed' | 'cancelled';

/**
 * Prescription information
 */
export interface Prescription {
    id: string;
    patient_id?: string;
    dentist_id?: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration_days?: number;
    instructions?: string;
    status: PrescriptionStatus | string;
    prescribed_date: string;
    expiry_date?: string;
    created_at: string;
    updated_at?: string;
}

// ============================================================================
// Patient Notes
// ============================================================================

export type PatientNoteType = 'general' | 'clinical' | 'billing' | 'follow_up' | 'emergency';

/**
 * Patient note/comment
 */
export interface PatientNote {
    id: string;
    patient_id?: string;
    dentist_id?: string;
    title: string;
    content: string;
    note_type: PatientNoteType | string;
    is_private: boolean;
    created_at: string;
    updated_at?: string;
}

// ============================================================================
// Consultation Context
// ============================================================================

/**
 * Context for active consultation sessions
 */
export interface ConsultationContext {
    appointmentId: string;
    patientId: string;
    dentistId: string;
    startedAt: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface NewPatientForm {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    address?: string;
    street_address?: string;
    house_number?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    medical_history?: string;
    emergency_contact?: string;
}

export interface UpdatePatientForm extends Partial<NewPatientForm> {
    id: string;
}

// ============================================================================
// Legacy type aliases for backward compatibility
// ============================================================================

/** @deprecated Use Patient instead */
export type DentistPatient = Patient;
