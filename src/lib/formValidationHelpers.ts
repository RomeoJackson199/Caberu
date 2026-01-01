import { z } from 'zod';

/**
 * Common validation schemas and helpers for forms
 */

// Email validation
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

// Phone validation (flexible format)
export const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number is too long')
  .regex(/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number');

// Name validation
export const nameSchema = z.string()
  .min(1, 'This field is required')
  .max(50, 'Name is too long')
  .regex(/^[a-zA-Z\s\-\']+$/, 'Please use only letters, spaces, hyphens, and apostrophes');

// Date validation (not in the past)
export const futureDateSchema = z.date({
  required_error: 'Please select a date',
  invalid_type_error: 'Invalid date',
}).refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
  message: 'Date must be in the future',
});

// Time validation (HH:MM format)
export const timeSchema = z.string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:MM format (e.g., 14:30)');

// Password validation (strong password)
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Optional password (for updates)
export const optionalPasswordSchema = z.string()
  .optional()
  .refine((val) => !val || val.length >= 8, {
    message: 'Password must be at least 8 characters if provided',
  });

// Appointment booking validation
export const appointmentBookingSchema = z.object({
  dentist_id: z.string().min(1, 'Please select a dentist'),
  appointment_date: futureDateSchema,
  appointment_time: timeSchema,
  service_id: z.string().optional(),
  reason: z.string()
    .min(3, 'Please provide a brief reason (at least 3 characters)')
    .max(500, 'Reason is too long (max 500 characters)'),
  notes: z.string().max(1000, 'Notes are too long (max 1000 characters)').optional(),
});

// Patient profile validation
export const patientProfileSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  date_of_birth: z.date().optional(),
  address: z.string().max(200, 'Address is too long').optional(),
});

// Payment validation
export const paymentSchema = z.object({
  amount: z.number()
    .min(0.01, 'Amount must be greater than 0')
    .max(100000, 'Amount is too large'),
  payment_method: z.enum(['card', 'cash', 'insurance', 'bank_transfer'], {
    required_error: 'Please select a payment method',
  }),
  notes: z.string().max(500).optional(),
});

/**
 * Helper to validate form data and return user-friendly errors
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Convert Zod errors to simple key-value object
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return { success: false, errors };
}

/**
 * Helper to get first error message from validation errors
 */
export function getFirstError(errors: Record<string, string>): string | null {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : null;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate appointment time is within business hours
 */
export function isWithinBusinessHours(time: string, businessHours?: { start: string; end: string }): boolean {
  if (!businessHours) {
    return true; // No restrictions if business hours not specified
  }

  const [hours, minutes] = time.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;

  const [startHours, startMinutes] = businessHours.start.split(':').map(Number);
  const startInMinutes = startHours * 60 + startMinutes;

  const [endHours, endMinutes] = businessHours.end.split(':').map(Number);
  const endInMinutes = endHours * 60 + endMinutes;

  return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
}

/**
 * Check if date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if date is a holiday (basic US holidays - can be expanded)
 */
export function isHoliday(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();

  // New Year's Day
  if (month === 0 && day === 1) return true;

  // Christmas Day
  if (month === 11 && day === 25) return true;

  // Independence Day
  if (month === 6 && day === 4) return true;

  // Add more holidays as needed

  return false;
}
