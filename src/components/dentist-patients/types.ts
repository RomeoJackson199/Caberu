/**
 * Patient management types
 * Re-exports from centralized types for backward compatibility
 */

// Re-export all patient types from centralized location
export {
  type Patient,
  type PatientFlags,
  type PatientAppointment,
  type PatientWithFlags,
  type PatientListItem,
  type ConsultationContext,
  type AppointmentGroup,
  type AppointmentStatus,
  type AppointmentUrgency,
  getAppointmentGroup,
} from '@/types/patient';

// Keep DentistPatient as an alias for backward compatibility
export type { Patient as DentistPatient } from '@/types/patient';
