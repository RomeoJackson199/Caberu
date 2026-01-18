/**
 * Centralized appointment-related type definitions
 * All appointment types should be imported from this file
 */

// Re-export base types from patient.ts for backward compatibility
export type { 
  AppointmentStatus, 
  AppointmentUrgency, 
  Appointment, 
  PatientAppointment,
  AppointmentGroup 
} from './patient';
export { getAppointmentGroup } from './patient';

// ============================================================================
// Extended Appointment Types
// ============================================================================

/**
 * Profile information nested in appointments
 */
export interface AppointmentProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
}

/**
 * Appointment with nested profile data (from Supabase join)
 */
export interface AppointmentWithProfile {
  id: string;
  patient_id: string;
  dentist_id?: string;
  business_id?: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  reason?: string;
  patient_name?: string;
  notes?: string;
  consultation_notes?: string;
  profiles?: AppointmentProfile;
}

/**
 * Appointment for display in lists (minimal fields)
 */
export interface AppointmentListItem {
  id: string;
  patient_id: string;
  patient_name?: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  reason?: string;
  consultation_notes?: string;
}

/**
 * Props for appointment list components
 */
export interface BaseAppointmentListProps {
  appointments: AppointmentListItem[];
  loading?: boolean;
  onViewDetails?: (appointment: AppointmentListItem) => void;
}

/**
 * Props for dentist appointment list with selection
 */
export interface DentistAppointmentListProps extends BaseAppointmentListProps {
  selectedAppointments?: string[];
  onSelectAppointment?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  onStatusChange?: (id: string, status: string, reason?: string) => void;
}

/**
 * Props for optimized appointment list
 */
export interface OptimizedAppointmentListProps {
  appointments: AppointmentListItem[];
  searchTerm: string;
  isDentistView?: boolean;
  onConfirm: (appointmentId: string) => Promise<void>;
  onCancel: (appointmentId: string) => Promise<void>;
  onDelete: (appointmentId: string) => Promise<void>;
  onViewDetails: (appointment: AppointmentListItem) => void;
  onComplete: (appointment: AppointmentListItem) => void;
}

// ============================================================================
// Appointment Manager Types
// ============================================================================

/**
 * Tab types for appointment manager
 */
export type AppointmentTab = 'upcoming' | 'today' | 'completed' | 'cancelled';

/**
 * Filter state for appointment manager
 */
export interface AppointmentFilters {
  searchTerm: string;
  statusFilter: string;
  dateFilter: string;
}
