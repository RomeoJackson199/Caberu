/**
 * Data validation utilities to ensure data integrity and prevent null pointer exceptions
 */
import type { 
  PatientLike, 
  ProviderLike, 
  AppointmentInput, 
  ValidationResult,
  UnknownRecord 
} from '@/types/validation';

/**
 * Safely get a nested property from an object
 *
 * @example
 * ```ts
 * const name = safeGet(appointment, 'patient.first_name', 'Unknown');
 * // Returns appointment?.patient?.first_name ?? 'Unknown'
 * ```
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue: T
): T {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return (current ?? defaultValue) as T;
}

/**
 * Validate that an object has required fields
 *
 * @example
 * ```ts
 * const patient = { first_name: 'John' };
 * const isValid = hasRequiredFields(patient, ['first_name', 'last_name']);
 * // Returns false because last_name is missing
 * ```
 */
export function hasRequiredFields(
  obj: unknown,
  fields: string[]
): boolean {
  if (!obj || typeof obj !== 'object') return false;

  return fields.every(field => {
    const value = safeGet(obj, field, null);
    return value != null && value !== '';
  });
}

/**
 * Get a patient's full name with fallback
 */
export function getPatientName(patient: PatientLike | null | undefined): string {
  if (!patient) return 'Unknown Patient';

  const firstName = patient.first_name || patient.firstName || '';
  const lastName = patient.last_name || patient.lastName || '';

  if (!firstName && !lastName) return 'Unknown Patient';
  if (!firstName) return lastName;
  if (!lastName) return firstName;

  return `${firstName} ${lastName}`.trim();
}

/**
 * Get a dentist/provider name with fallback
 */
export function getProviderName(provider: ProviderLike | null | undefined): string {
  if (!provider) return 'Unassigned';

  // Handle nested profiles structure
  const profile = provider.profiles || provider.profile || provider;

  const firstName = profile.first_name || profile.firstName || '';
  const lastName = profile.last_name || profile.lastName || '';

  if (!firstName && !lastName) return 'Unassigned Provider';
  if (!firstName) return lastName;
  if (!lastName) return firstName;

  return `${firstName} ${lastName}`.trim();
}

/**
 * Safely format a date with fallback
 */
export function safeFormatDate(
  date: string | Date | null | undefined,
  defaultValue: string = 'N/A'
): string {
  if (!date) return defaultValue;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return defaultValue;
    return dateObj.toISOString();
  } catch {
    return defaultValue;
  }
}

/**
 * Validate an email address
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a phone number (basic validation)
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone || typeof phone !== 'string') return false;

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's between 10-15 digits (international numbers)
  return /^\+?\d{10,15}$/.test(cleaned);
}

/**
 * Ensure a value is an array
 */
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  defaultValue: T
): T {
  if (!json || typeof json !== 'string') return defaultValue;

  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate appointment data before save
 */
export function validateAppointment(appointment: AppointmentInput): ValidationResult {
  const errors: string[] = [];

  if (!appointment.patient_id) {
    errors.push('Patient is required');
  }

  if (!appointment.dentist_id) {
    errors.push('Dentist is required');
  }

  if (!appointment.appointment_date) {
    errors.push('Appointment date is required');
  } else {
    const date = new Date(appointment.appointment_date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid appointment date');
    } else if (date < new Date()) {
      errors.push('Appointment date cannot be in the past');
    }
  }

  if (!appointment.duration_minutes || appointment.duration_minutes <= 0) {
    errors.push('Valid duration is required');
  }

  if (!appointment.business_id) {
    errors.push('Business is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Deep clone an object safely
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}
