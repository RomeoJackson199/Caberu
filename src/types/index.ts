/**
 * Central barrel file for all type definitions
 * Import types from this file for convenience and consistency
 *
 * @example
 * import { Patient, PatientAppointment, AppointmentStatus } from '@/types';
 */

// Patient and appointment types
export * from './patient';

// Re-export commonly used types for convenience
export type {
  Patient,
  PatientWithStats,
  PatientWithFlags,
  PatientWithUserData,
  PatientMinimal,
  PatientListItem,
  PatientAppointment,
  AppointmentWithProfiles,
  AppointmentWithDentist,
  AppointmentStatus,
  AppointmentUrgency,
  AppointmentGroup,
  TreatmentPlan,
  TreatmentPlanStatus,
  TreatmentPlanPriority,
  Prescription,
  PrescriptionStatus,
  PatientNote,
  PatientNoteType,
  Profile,
} from './patient';
