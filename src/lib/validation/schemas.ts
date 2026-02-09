/**
 * Zod Validation Schemas
 * Centralized validation schemas for all forms
 */

import { z } from 'zod';

// Common validators
const emailSchema = z
  .string()
  .trim()
  .email({ message: 'Invalid email address' })
  .max(255, { message: 'Email must be less than 255 characters' });

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, { message: 'Invalid phone number' })
  .max(20, { message: 'Phone number is too long' })
  .optional()
  .or(z.literal(''));

const nameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Name is required' })
  .max(100, { message: 'Name must be less than 100 characters' })
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: 'Name contains invalid characters' });

const optionalNameSchema = z
  .string()
  .trim()
  .max(100, { message: 'Name must be less than 100 characters' })
  .regex(/^[a-zA-ZÀ-ÿ\s'-]*$/, { message: 'Name contains invalid characters' })
  .optional()
  .or(z.literal(''));

// Date of birth - must be in the past, within reasonable range
const dateOfBirthSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true; // Optional
      const date = new Date(val);
      const now = new Date();
      const minDate = new Date('1900-01-01');
      return date <= now && date >= minDate;
    },
    { message: 'Invalid date of birth' }
  )
  .optional()
  .or(z.literal(''));

// Address - free text with length limit (legacy single field)
const addressSchema = z
  .string()
  .trim()
  .max(500, { message: 'Address must be less than 500 characters' })
  .optional()
  .or(z.literal(''));

// Structured address fields
const streetAddressSchema = z
  .string()
  .trim()
  .max(200, { message: 'Street address must be less than 200 characters' })
  .optional()
  .or(z.literal(''));

const houseNumberSchema = z
  .string()
  .trim()
  .max(20, { message: 'House number must be less than 20 characters' })
  .optional()
  .or(z.literal(''));

const citySchema = z
  .string()
  .trim()
  .max(100, { message: 'City must be less than 100 characters' })
  .optional()
  .or(z.literal(''));

const postalCodeSchema = z
  .string()
  .trim()
  .max(20, { message: 'Postal code must be less than 20 characters' })
  .optional()
  .or(z.literal(''));

const countrySchema = z
  .string()
  .trim()
  .max(100, { message: 'Country must be less than 100 characters' })
  .optional()
  .or(z.literal(''));

// Medical history - PHI, needs extra care
const medicalHistorySchema = z
  .string()
  .trim()
  .max(5000, { message: 'Medical history must be less than 5000 characters' })
  .optional()
  .or(z.literal(''));

/**
 * Patient Profile Schema
 */
export const patientProfileSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  date_of_birth: dateOfBirthSchema,
  address: addressSchema,
  street_address: streetAddressSchema,
  house_number: houseNumberSchema,
  city: citySchema,
  postal_code: postalCodeSchema,
  country: countrySchema,
  medical_history: medicalHistorySchema,
  emergency_contact: z
    .string()
    .trim()
    .max(200, { message: 'Emergency contact must be less than 200 characters' })
    .optional()
    .or(z.literal('')),
});

export type PatientProfileFormData = z.infer<typeof patientProfileSchema>;

/**
 * Quick Invite Schema (minimal patient creation)
 */
export const quickInviteSchema = z.object({
  first_name: optionalNameSchema,
  last_name: optionalNameSchema,
  email: emailSchema,
});

export type QuickInviteFormData = z.infer<typeof quickInviteSchema>;

/**
 * Clinical Note Schema
 */
export const clinicalNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Title is required' })
    .max(200, { message: 'Title must be less than 200 characters' }),
  content: z
    .string()
    .trim()
    .min(1, { message: 'Content is required' })
    .max(10000, { message: 'Content must be less than 10000 characters' }),
  note_type: z.enum(['general', 'consultation', 'follow_up', 'reminder']).default('general'),
  is_private: z.boolean().default(false),
});

export type ClinicalNoteFormData = z.infer<typeof clinicalNoteSchema>;

/**
 * Treatment Plan Schema
 */
export const treatmentPlanSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Title is required' })
    .max(200, { message: 'Title must be less than 200 characters' }),
  description: z
    .string()
    .trim()
    .max(5000, { message: 'Description must be less than 5000 characters' })
    .optional()
    .or(z.literal('')),
  diagnosis: z
    .string()
    .trim()
    .max(2000, { message: 'Diagnosis must be less than 2000 characters' })
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(5000, { message: 'Notes must be less than 5000 characters' })
    .optional()
    .or(z.literal('')),
  estimated_cost_cents: z.number().int().min(0).optional(),
  status: z.enum(['proposed', 'accepted', 'in_progress', 'completed', 'cancelled']).default('proposed'),
});

export type TreatmentPlanFormData = z.infer<typeof treatmentPlanSchema>;

/**
 * Appointment Schema
 */
export const appointmentSchema = z.object({
  patient_id: z.string().uuid({ message: 'Invalid patient ID' }),
  dentist_id: z.string().uuid({ message: 'Invalid provider ID' }),
  appointment_date: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Invalid appointment date' }
    ),
  reason: z
    .string()
    .trim()
    .min(1, { message: 'Reason is required' })
    .max(500, { message: 'Reason must be less than 500 characters' }),
  notes: z
    .string()
    .trim()
    .max(2000, { message: 'Notes must be less than 2000 characters' })
    .optional()
    .or(z.literal('')),
  urgency: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  duration_minutes: z.number().int().min(5).max(480).default(30),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;

/**
 * Login Schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, { message: 'Password is required' }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Signup Schema
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  confirmPassword: z.string(),
  first_name: nameSchema,
  last_name: nameSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SignupFormData = z.infer<typeof signupSchema>;

/**
 * Business Creation Schema
 */
export const businessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Business name must be at least 2 characters' })
    .max(100, { message: 'Business name must be less than 100 characters' }),
  slug: z
    .string()
    .trim()
    .min(2, { message: 'URL slug must be at least 2 characters' })
    .max(50, { message: 'URL slug must be less than 50 characters' })
    .regex(/^[a-z0-9-]+$/, { message: 'URL slug can only contain lowercase letters, numbers, and hyphens' }),
  phone: phoneSchema,
  address: addressSchema,
  bio: z
    .string()
    .trim()
    .max(1000, { message: 'Bio must be less than 1000 characters' })
    .optional()
    .or(z.literal('')),
});

export type BusinessFormData = z.infer<typeof businessSchema>;

/**
 * Allergy Schema (PHI)
 */
export const allergySchema = z.object({
  allergy_name: z
    .string()
    .trim()
    .min(1, { message: 'Allergy name is required' })
    .max(200, { message: 'Allergy name must be less than 200 characters' }),
  severity: z.enum(['mild', 'moderate', 'severe', 'life_threatening']),
  notes: z
    .string()
    .trim()
    .max(1000, { message: 'Notes must be less than 1000 characters' })
    .optional()
    .or(z.literal('')),
});

export type AllergyFormData = z.infer<typeof allergySchema>;

/**
 * Helper function to validate form data
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Extract error messages from Zod errors
 */
export function getZodErrorMessages(errors: z.ZodError): Record<string, string> {
  const messages: Record<string, string> = {};
  
  for (const issue of errors.issues) {
    const path = issue.path.join('.');
    if (!messages[path]) {
      messages[path] = issue.message;
    }
  }
  
  return messages;
}
