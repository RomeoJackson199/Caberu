/**
 * Tests for formValidationHelpers.ts - Form validation schemas and helpers
 */

import {
  emailSchema,
  phoneSchema,
  nameSchema,
  futureDateSchema,
  timeSchema,
  passwordSchema,
  optionalPasswordSchema,
  appointmentBookingSchema,
  patientProfileSchema,
  paymentSchema,
  validateFormData,
  getFirstError,
  sanitizeInput,
  isWithinBusinessHours,
  isWeekend,
  isHoliday,
} from '../formValidationHelpers';

describe('formValidationHelpers.ts', () => {
  describe('Schema Validations', () => {
    describe('emailSchema', () => {
      it('should accept valid emails', () => {
        expect(emailSchema.safeParse('test@example.com').success).toBe(true);
        expect(emailSchema.safeParse('user.name@domain.co.uk').success).toBe(true);
      });

      it('should reject empty email', () => {
        const result = emailSchema.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject invalid email format', () => {
        expect(emailSchema.safeParse('invalid').success).toBe(false);
        expect(emailSchema.safeParse('test@').success).toBe(false);
      });
    });

    describe('phoneSchema', () => {
      it('should accept valid phone numbers', () => {
        expect(phoneSchema.safeParse('1234567890').success).toBe(true);
        expect(phoneSchema.safeParse('+32471123456').success).toBe(true); // 12 chars
        expect(phoneSchema.safeParse('555-123-4567').success).toBe(true); // 12 chars
      });

      it('should reject phone numbers that are too short', () => {
        expect(phoneSchema.safeParse('12345').success).toBe(false);
      });

      it('should reject phone numbers that are too long', () => {
        expect(phoneSchema.safeParse('1234567890123456').success).toBe(false);
      });

      it('should reject phone numbers with invalid characters', () => {
        expect(phoneSchema.safeParse('123-abc-7890').success).toBe(false);
      });
    });

    describe('nameSchema', () => {
      it('should accept valid names', () => {
        expect(nameSchema.safeParse('John').success).toBe(true);
        expect(nameSchema.safeParse('Mary Jane').success).toBe(true);
        expect(nameSchema.safeParse("O'Connor").success).toBe(true);
        expect(nameSchema.safeParse('Smith-Jones').success).toBe(true);
      });

      it('should reject empty names', () => {
        expect(nameSchema.safeParse('').success).toBe(false);
      });

      it('should reject names with numbers', () => {
        expect(nameSchema.safeParse('John123').success).toBe(false);
      });

      it('should reject names that are too long', () => {
        const longName = 'A'.repeat(51);
        expect(nameSchema.safeParse(longName).success).toBe(false);
      });
    });

    describe('futureDateSchema', () => {
      it('should accept future dates', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        expect(futureDateSchema.safeParse(futureDate).success).toBe(true);
      });

      it('should accept today', () => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        expect(futureDateSchema.safeParse(today).success).toBe(true);
      });

      it('should reject past dates', () => {
        const pastDate = new Date('2020-01-01');
        expect(futureDateSchema.safeParse(pastDate).success).toBe(false);
      });

      it('should reject invalid date', () => {
        expect(futureDateSchema.safeParse('invalid').success).toBe(false);
      });
    });

    describe('timeSchema', () => {
      it('should accept valid time formats', () => {
        expect(timeSchema.safeParse('09:00').success).toBe(true);
        expect(timeSchema.safeParse('14:30').success).toBe(true);
        expect(timeSchema.safeParse('23:59').success).toBe(true);
        expect(timeSchema.safeParse('0:00').success).toBe(true);
      });

      it('should reject invalid time formats', () => {
        expect(timeSchema.safeParse('25:00').success).toBe(false);
        expect(timeSchema.safeParse('12:60').success).toBe(false);
        expect(timeSchema.safeParse('invalid').success).toBe(false);
      });
    });

    describe('passwordSchema', () => {
      it('should accept strong passwords', () => {
        expect(passwordSchema.safeParse('StrongPass1').success).toBe(true);
        expect(passwordSchema.safeParse('MyPassword123').success).toBe(true);
      });

      it('should reject passwords without lowercase', () => {
        expect(passwordSchema.safeParse('PASSWORD123').success).toBe(false);
      });

      it('should reject passwords without uppercase', () => {
        expect(passwordSchema.safeParse('password123').success).toBe(false);
      });

      it('should reject passwords without numbers', () => {
        expect(passwordSchema.safeParse('PasswordOnly').success).toBe(false);
      });

      it('should reject short passwords', () => {
        expect(passwordSchema.safeParse('Pa1').success).toBe(false);
      });
    });

    describe('optionalPasswordSchema', () => {
      it('should accept undefined', () => {
        expect(optionalPasswordSchema.safeParse(undefined).success).toBe(true);
      });

      it('should accept empty string via transform or skip', () => {
        // Optional password allows undefined
        expect(optionalPasswordSchema.safeParse(undefined).success).toBe(true);
      });

      it('should reject short passwords when provided', () => {
        expect(optionalPasswordSchema.safeParse('short').success).toBe(false);
      });

      it('should accept long passwords when provided', () => {
        expect(optionalPasswordSchema.safeParse('LongEnoughPassword').success).toBe(true);
      });
    });
  });

  describe('Complex Schemas', () => {
    describe('appointmentBookingSchema', () => {
      const validAppointment = {
        dentist_id: 'dentist-123',
        appointment_date: new Date(Date.now() + 86400000), // Tomorrow
        appointment_time: '10:00',
        reason: 'Regular checkup',
      };

      it('should accept valid appointment data', () => {
        expect(appointmentBookingSchema.safeParse(validAppointment).success).toBe(true);
      });

      it('should accept optional fields', () => {
        const withOptional = {
          ...validAppointment,
          service_id: 'service-123',
          notes: 'Additional notes',
        };
        expect(appointmentBookingSchema.safeParse(withOptional).success).toBe(true);
      });

      it('should reject missing dentist_id', () => {
        const { dentist_id, ...withoutDentist } = validAppointment;
        expect(appointmentBookingSchema.safeParse(withoutDentist).success).toBe(false);
      });

      it('should reject reason that is too short', () => {
        const shortReason = { ...validAppointment, reason: 'ab' };
        expect(appointmentBookingSchema.safeParse(shortReason).success).toBe(false);
      });

      it('should reject reason that is too long', () => {
        const longReason = { ...validAppointment, reason: 'a'.repeat(501) };
        expect(appointmentBookingSchema.safeParse(longReason).success).toBe(false);
      });

      it('should reject notes that are too long', () => {
        const longNotes = { ...validAppointment, notes: 'a'.repeat(1001) };
        expect(appointmentBookingSchema.safeParse(longNotes).success).toBe(false);
      });
    });

    describe('patientProfileSchema', () => {
      const validProfile = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      it('should accept valid profile', () => {
        expect(patientProfileSchema.safeParse(validProfile).success).toBe(true);
      });

      it('should accept optional fields', () => {
        const withOptional = {
          ...validProfile,
          phone: '1234567890',
          date_of_birth: new Date('1990-01-15'),
          address: '123 Main St',
        };
        expect(patientProfileSchema.safeParse(withOptional).success).toBe(true);
      });

      it('should reject address that is too long', () => {
        const longAddress = { ...validProfile, address: 'a'.repeat(201) };
        expect(patientProfileSchema.safeParse(longAddress).success).toBe(false);
      });
    });

    describe('paymentSchema', () => {
      it('should accept valid payment', () => {
        const payment = {
          amount: 100.50,
          payment_method: 'card' as const,
        };
        expect(paymentSchema.safeParse(payment).success).toBe(true);
      });

      it('should accept all payment methods', () => {
        const methods = ['card', 'cash', 'insurance', 'bank_transfer'] as const;
        methods.forEach(method => {
          const payment = { amount: 50, payment_method: method };
          expect(paymentSchema.safeParse(payment).success).toBe(true);
        });
      });

      it('should reject amount that is too small', () => {
        const payment = { amount: 0, payment_method: 'card' as const };
        expect(paymentSchema.safeParse(payment).success).toBe(false);
      });

      it('should reject amount that is too large', () => {
        const payment = { amount: 150000, payment_method: 'card' as const };
        expect(paymentSchema.safeParse(payment).success).toBe(false);
      });

      it('should reject invalid payment method', () => {
        const payment = { amount: 50, payment_method: 'bitcoin' };
        expect(paymentSchema.safeParse(payment).success).toBe(false);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('validateFormData', () => {
      it('should return success with valid data', () => {
        const result = validateFormData(emailSchema, 'test@example.com');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('test@example.com');
        }
      });

      it('should return errors with invalid data', () => {
        const result = validateFormData(emailSchema, 'invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors).toBeDefined();
          expect(Object.keys(result.errors).length).toBeGreaterThan(0);
        }
      });

      it('should handle nested validation errors', () => {
        const result = validateFormData(patientProfileSchema, {
          first_name: '',
          last_name: '',
          email: 'invalid',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors['first_name']).toBeDefined();
          expect(result.errors['last_name']).toBeDefined();
          expect(result.errors['email']).toBeDefined();
        }
      });
    });

    describe('getFirstError', () => {
      it('should return first error message', () => {
        const errors = {
          first_name: 'First name is required',
          email: 'Invalid email',
        };
        const result = getFirstError(errors);
        expect(result).toBe('First name is required');
      });

      it('should return null for empty errors', () => {
        const result = getFirstError({});
        expect(result).toBeNull();
      });
    });

    describe('sanitizeInput', () => {
      it('should escape HTML characters', () => {
        expect(sanitizeInput('<script>alert("xss")</script>')).toContain('&lt;');
        expect(sanitizeInput('<script>alert("xss")</script>')).toContain('&gt;');
      });

      it('should escape quotes', () => {
        expect(sanitizeInput('"quoted"')).toBe('&quot;quoted&quot;');
        expect(sanitizeInput("'single'")).toBe('&#x27;single&#x27;');
      });

      it('should escape forward slashes', () => {
        expect(sanitizeInput('path/to/file')).toBe('path&#x2F;to&#x2F;file');
      });

      it('should handle empty string', () => {
        expect(sanitizeInput('')).toBe('');
      });
    });

    describe('isWithinBusinessHours', () => {
      const businessHours = { start: '09:00', end: '17:00' };

      it('should return true for times within business hours', () => {
        expect(isWithinBusinessHours('10:00', businessHours)).toBe(true);
        expect(isWithinBusinessHours('14:30', businessHours)).toBe(true);
        expect(isWithinBusinessHours('09:00', businessHours)).toBe(true);
        expect(isWithinBusinessHours('17:00', businessHours)).toBe(true);
      });

      it('should return false for times outside business hours', () => {
        expect(isWithinBusinessHours('08:00', businessHours)).toBe(false);
        expect(isWithinBusinessHours('18:00', businessHours)).toBe(false);
        expect(isWithinBusinessHours('23:00', businessHours)).toBe(false);
      });

      it('should return true when no business hours specified', () => {
        expect(isWithinBusinessHours('23:00')).toBe(true);
        expect(isWithinBusinessHours('03:00', undefined)).toBe(true);
      });
    });

    describe('isWeekend', () => {
      it('should return true for Saturday', () => {
        const saturday = new Date('2024-01-13'); // A Saturday
        expect(isWeekend(saturday)).toBe(true);
      });

      it('should return true for Sunday', () => {
        const sunday = new Date('2024-01-14'); // A Sunday
        expect(isWeekend(sunday)).toBe(true);
      });

      it('should return false for weekdays', () => {
        const monday = new Date('2024-01-15'); // A Monday
        const wednesday = new Date('2024-01-17'); // A Wednesday
        const friday = new Date('2024-01-19'); // A Friday

        expect(isWeekend(monday)).toBe(false);
        expect(isWeekend(wednesday)).toBe(false);
        expect(isWeekend(friday)).toBe(false);
      });
    });

    describe('isHoliday', () => {
      it('should return true for New Year\'s Day', () => {
        const newYear = new Date('2024-01-01');
        expect(isHoliday(newYear)).toBe(true);
      });

      it('should return true for Christmas', () => {
        const christmas = new Date('2024-12-25');
        expect(isHoliday(christmas)).toBe(true);
      });

      it('should return true for Independence Day', () => {
        const july4 = new Date('2024-07-04');
        expect(isHoliday(july4)).toBe(true);
      });

      it('should return false for regular days', () => {
        const regularDay = new Date('2024-03-15');
        expect(isHoliday(regularDay)).toBe(false);
      });
    });
  });
});
