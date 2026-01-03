/**
 * Validation-related types for replacing `any` usage in data validation utilities
 */

export interface PatientLike {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  id?: string;
}

export interface ProviderLike {
  profiles?: ProfileLike;
  profile?: ProfileLike;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  id?: string;
}

export interface ProfileLike {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email?: string;
}

export interface AppointmentInput {
  patient_id?: string;
  dentist_id?: string;
  appointment_date?: string;
  duration_minutes?: number;
  business_id?: string;
  status?: string;
  reason?: string;
  urgency?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type UnknownRecord = Record<string, unknown>;
