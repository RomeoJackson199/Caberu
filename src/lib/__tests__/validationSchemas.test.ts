/**
 * Tests for validationSchemas.ts - Centralized Zod validation schemas
 */

import {
  emailSchema,
  phoneSchema,
  nameSchema,
  passwordSchema,
  dateSchema,
  timeSchema,
  signupSchema,
  loginSchema,
  profileUpdateSchema,
  changePasswordSchema,
  appointmentBookingSchema,
  emergencyTriageSchema,
  medicalRecordSchema,
  prescriptionSchema,
  treatmentPlanSchema,
  businessCreationSchema,
  dentistProfileSchema,
  serviceSchema,
  serviceCreationSchema,
  servicesArraySchema,
  paymentRequestSchema,
  inventoryItemSchema,
  notificationPreferencesSchema,
  chatMessageSchema,
  validateData,
  getValidationErrorMessages,
  sanitizeString,
  sanitizeServiceData,
} from '../validationSchemas';
import { z } from 'zod';

describe('validationSchemas.ts', () => {
  describe('Common Schemas', () => {
    describe('emailSchema', () => {
      it('should accept valid email addresses', () => {
        expect(emailSchema.safeParse('test@example.com').success).toBe(true);
        expect(emailSchema.safeParse('user.name@domain.co.uk').success).toBe(true);
        expect(emailSchema.safeParse('test+label@gmail.com').success).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(emailSchema.safeParse('invalid').success).toBe(false);
        expect(emailSchema.safeParse('test@').success).toBe(false);
        expect(emailSchema.safeParse('@domain.com').success).toBe(false);
        expect(emailSchema.safeParse('').success).toBe(false);
      });

      it('should reject emails that are too long', () => {
        const longEmail = 'a'.repeat(250) + '@test.com';
        expect(emailSchema.safeParse(longEmail).success).toBe(false);
      });
    });

    describe('phoneSchema', () => {
      it('should accept valid phone numbers', () => {
        // The regex pattern supports: +[country code] (area) number patterns
        expect(phoneSchema.safeParse('+32 471 123456789').success).toBe(true);
        expect(phoneSchema.safeParse('(123) 456 789012').success).toBe(true);
        expect(phoneSchema.safeParse('+1234567890123').success).toBe(true);
      });

      it('should accept empty string (optional field)', () => {
        expect(phoneSchema.safeParse('').success).toBe(true);
        expect(phoneSchema.safeParse(undefined).success).toBe(true);
      });

      it('should reject invalid phone numbers', () => {
        expect(phoneSchema.safeParse('abc123').success).toBe(false);
      });
    });

    describe('nameSchema', () => {
      it('should accept valid names', () => {
        expect(nameSchema.safeParse('John').success).toBe(true);
        expect(nameSchema.safeParse('Mary Jane').success).toBe(true);
        expect(nameSchema.safeParse("O'Connor").success).toBe(true);
        expect(nameSchema.safeParse('Smith-Jones').success).toBe(true);
      });

      it('should reject names with invalid characters', () => {
        expect(nameSchema.safeParse('John123').success).toBe(false);
        expect(nameSchema.safeParse('User@name').success).toBe(false);
        expect(nameSchema.safeParse('').success).toBe(false);
      });

      it('should reject names that are too long', () => {
        const longName = 'A'.repeat(101);
        expect(nameSchema.safeParse(longName).success).toBe(false);
      });
    });

    describe('passwordSchema', () => {
      it('should accept valid passwords', () => {
        expect(passwordSchema.safeParse('ValidPass1').success).toBe(true);
        expect(passwordSchema.safeParse('MyPassword123').success).toBe(true);
        expect(passwordSchema.safeParse('Str0ngP@ss').success).toBe(true);
      });

      it('should reject passwords without uppercase', () => {
        const result = passwordSchema.safeParse('password123');
        expect(result.success).toBe(false);
      });

      it('should reject passwords without lowercase', () => {
        const result = passwordSchema.safeParse('PASSWORD123');
        expect(result.success).toBe(false);
      });

      it('should reject passwords without numbers', () => {
        const result = passwordSchema.safeParse('PasswordOnly');
        expect(result.success).toBe(false);
      });

      it('should reject passwords that are too short', () => {
        const result = passwordSchema.safeParse('Pa1');
        expect(result.success).toBe(false);
      });

      it('should reject passwords that are too long', () => {
        const longPassword = 'ValidPass1' + 'a'.repeat(120);
        expect(passwordSchema.safeParse(longPassword).success).toBe(false);
      });
    });

    describe('dateSchema', () => {
      it('should accept valid date strings', () => {
        expect(dateSchema.safeParse('2024-01-15').success).toBe(true);
        expect(dateSchema.safeParse('2023-12-31').success).toBe(true);
      });

      it('should reject invalid date formats', () => {
        expect(dateSchema.safeParse('01-15-2024').success).toBe(false);
        expect(dateSchema.safeParse('2024/01/15').success).toBe(false);
        expect(dateSchema.safeParse('invalid').success).toBe(false);
      });
    });

    describe('timeSchema', () => {
      it('should accept valid time strings', () => {
        expect(timeSchema.safeParse('09:00').success).toBe(true);
        expect(timeSchema.safeParse('14:30').success).toBe(true);
        expect(timeSchema.safeParse('00:00').success).toBe(true);
        expect(timeSchema.safeParse('23:59').success).toBe(true);
      });

      it('should reject invalid time formats', () => {
        expect(timeSchema.safeParse('25:00').success).toBe(false);
        expect(timeSchema.safeParse('9:00').success).toBe(true); // Single digit hour is valid
        expect(timeSchema.safeParse('09:60').success).toBe(false);
        expect(timeSchema.safeParse('invalid').success).toBe(false);
      });
    });
  });

  describe('User & Authentication Schemas', () => {
    describe('signupSchema', () => {
      const validSignupData = {
        email: 'test@example.com',
        password: 'ValidPass1',
        confirmPassword: 'ValidPass1',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        termsAccepted: true,
      };

      it('should accept valid signup data', () => {
        expect(signupSchema.safeParse(validSignupData).success).toBe(true);
      });

      it('should reject when passwords do not match', () => {
        const data = { ...validSignupData, confirmPassword: 'DifferentPass1' };
        const result = signupSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject when terms are not accepted', () => {
        const data = { ...validSignupData, termsAccepted: false };
        const result = signupSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject with invalid email', () => {
        const data = { ...validSignupData, email: 'invalid' };
        expect(signupSchema.safeParse(data).success).toBe(false);
      });
    });

    describe('loginSchema', () => {
      it('should accept valid login data', () => {
        const data = { email: 'test@example.com', password: 'anypassword' };
        expect(loginSchema.safeParse(data).success).toBe(true);
      });

      it('should accept optional rememberMe', () => {
        const data = { email: 'test@example.com', password: 'pass', rememberMe: true };
        expect(loginSchema.safeParse(data).success).toBe(true);
      });

      it('should reject empty password', () => {
        const data = { email: 'test@example.com', password: '' };
        expect(loginSchema.safeParse(data).success).toBe(false);
      });
    });

    describe('changePasswordSchema', () => {
      it('should accept valid password change', () => {
        const data = {
          currentPassword: 'OldPass123',
          newPassword: 'NewPass456',
          confirmNewPassword: 'NewPass456',
        };
        expect(changePasswordSchema.safeParse(data).success).toBe(true);
      });

      it('should reject when new passwords do not match', () => {
        const data = {
          currentPassword: 'OldPass123',
          newPassword: 'NewPass456',
          confirmNewPassword: 'Different789',
        };
        expect(changePasswordSchema.safeParse(data).success).toBe(false);
      });

      it('should reject when new password equals current password', () => {
        const data = {
          currentPassword: 'SamePass123',
          newPassword: 'SamePass123',
          confirmNewPassword: 'SamePass123',
        };
        expect(changePasswordSchema.safeParse(data).success).toBe(false);
      });
    });
  });

  describe('Appointment Booking Schemas', () => {
    describe('appointmentBookingSchema', () => {
      const validAppointment = {
        dentistId: '550e8400-e29b-41d4-a716-446655440000',
        appointmentDate: '2024-06-15',
        appointmentTime: '10:00',
        reason: 'Regular checkup',
        duration: 30,
        urgency: 'low' as const,
        notes: 'First visit',
        isEmergency: false,
      };

      it('should accept valid appointment data', () => {
        expect(appointmentBookingSchema.safeParse(validAppointment).success).toBe(true);
      });

      it('should reject invalid UUID for dentistId', () => {
        const data = { ...validAppointment, dentistId: 'not-a-uuid' };
        expect(appointmentBookingSchema.safeParse(data).success).toBe(false);
      });

      it('should reject duration less than 15 minutes', () => {
        const data = { ...validAppointment, duration: 10 };
        expect(appointmentBookingSchema.safeParse(data).success).toBe(false);
      });

      it('should reject duration more than 240 minutes', () => {
        const data = { ...validAppointment, duration: 300 };
        expect(appointmentBookingSchema.safeParse(data).success).toBe(false);
      });

      it('should reject reason that is too short', () => {
        const data = { ...validAppointment, reason: 'ab' };
        expect(appointmentBookingSchema.safeParse(data).success).toBe(false);
      });

      it('should accept all urgency levels', () => {
        const urgencyLevels = ['low', 'medium', 'high', 'emergency'] as const;
        urgencyLevels.forEach(urgency => {
          const data = { ...validAppointment, urgency };
          expect(appointmentBookingSchema.safeParse(data).success).toBe(true);
        });
      });
    });

    describe('emergencyTriageSchema', () => {
      const validTriage = {
        painLevel: 7,
        symptoms: ['toothache', 'swelling'],
        duration: 'day' as const,
        description: 'Severe pain in lower left molar area',
        hasSwelling: true,
        hasBleeding: false,
        hasFever: false,
        canEat: false,
        canSleep: false,
      };

      it('should accept valid triage data', () => {
        expect(emergencyTriageSchema.safeParse(validTriage).success).toBe(true);
      });

      it('should reject pain level outside 0-10 range', () => {
        expect(emergencyTriageSchema.safeParse({ ...validTriage, painLevel: -1 }).success).toBe(false);
        expect(emergencyTriageSchema.safeParse({ ...validTriage, painLevel: 11 }).success).toBe(false);
      });

      it('should reject empty symptoms array', () => {
        const data = { ...validTriage, symptoms: [] };
        expect(emergencyTriageSchema.safeParse(data).success).toBe(false);
      });

      it('should reject description that is too short', () => {
        const data = { ...validTriage, description: 'Too short' };
        expect(emergencyTriageSchema.safeParse(data).success).toBe(false);
      });
    });
  });

  describe('Medical Records Schemas', () => {
    describe('medicalRecordSchema', () => {
      const validRecord = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        diagnosis: 'Dental caries',
        treatment: 'Composite filling',
        notes: 'Patient tolerated procedure well',
      };

      it('should accept valid medical record', () => {
        expect(medicalRecordSchema.safeParse(validRecord).success).toBe(true);
      });

      it('should reject invalid patient UUID', () => {
        const data = { ...validRecord, patientId: 'invalid' };
        expect(medicalRecordSchema.safeParse(data).success).toBe(false);
      });
    });

    describe('prescriptionSchema', () => {
      const validPrescription = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        medication: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'Three times daily',
        duration: '7 days',
        startDate: '2024-01-15',
      };

      it('should accept valid prescription', () => {
        expect(prescriptionSchema.safeParse(validPrescription).success).toBe(true);
      });

      it('should accept optional instructions and endDate', () => {
        const data = {
          ...validPrescription,
          instructions: 'Take with food',
          endDate: '2024-01-22',
        };
        expect(prescriptionSchema.safeParse(data).success).toBe(true);
      });
    });

    describe('treatmentPlanSchema', () => {
      const validPlan = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Full mouth rehabilitation',
        description: 'Comprehensive treatment plan for full mouth restoration',
        priority: 'high' as const,
        status: 'proposed' as const,
      };

      it('should accept valid treatment plan', () => {
        expect(treatmentPlanSchema.safeParse(validPlan).success).toBe(true);
      });

      it('should accept optional cost and duration', () => {
        const data = {
          ...validPlan,
          estimatedCost: 5000,
          estimatedDuration: '6 months',
        };
        expect(treatmentPlanSchema.safeParse(data).success).toBe(true);
      });

      it('should reject negative cost', () => {
        const data = { ...validPlan, estimatedCost: -100 };
        expect(treatmentPlanSchema.safeParse(data).success).toBe(false);
      });
    });
  });

  describe('Business & Dentist Schemas', () => {
    describe('businessCreationSchema', () => {
      const validBusiness = {
        name: 'Smile Dental Clinic',
        slug: 'smile-dental',
        businessType: 'dental' as const,
        phone: '+32471123456',
        email: 'info@smiledental.com',
      };

      it('should accept valid business data', () => {
        expect(businessCreationSchema.safeParse(validBusiness).success).toBe(true);
      });

      it('should reject invalid slug format', () => {
        const data = { ...validBusiness, slug: 'Invalid Slug!' };
        expect(businessCreationSchema.safeParse(data).success).toBe(false);
      });

      it('should accept all business types', () => {
        const types = ['dental', 'gym', 'medical', 'generic'] as const;
        types.forEach(businessType => {
          const data = { ...validBusiness, businessType };
          expect(businessCreationSchema.safeParse(data).success).toBe(true);
        });
      });

      it('should accept optional website URL', () => {
        const data = { ...validBusiness, websiteUrl: 'https://example.com' };
        expect(businessCreationSchema.safeParse(data).success).toBe(true);
      });

      it('should accept empty website URL', () => {
        const data = { ...validBusiness, websiteUrl: '' };
        expect(businessCreationSchema.safeParse(data).success).toBe(true);
      });
    });

    describe('dentistProfileSchema', () => {
      it('should accept valid dentist profile', () => {
        const data = {
          specialization: 'Orthodontics',
          licenseNumber: 'DDS123456',
          yearsOfExperience: 10,
          bio: 'Experienced orthodontist',
          languages: ['English', 'Dutch', 'French'],
        };
        expect(dentistProfileSchema.safeParse(data).success).toBe(true);
      });

      it('should reject negative years of experience', () => {
        const data = { yearsOfExperience: -5 };
        expect(dentistProfileSchema.safeParse(data).success).toBe(false);
      });

      it('should reject unrealistic years of experience', () => {
        const data = { yearsOfExperience: 75 };
        expect(dentistProfileSchema.safeParse(data).success).toBe(false);
      });
    });
  });

  describe('Service Schemas', () => {
    describe('serviceSchema', () => {
      const validService = {
        name: 'Teeth Cleaning',
        description: 'Professional dental cleaning',
        price: 75,
        priceCents: 7500,
        currency: 'EUR' as const,
        duration_minutes: 45,
        category: 'Preventive Care',
        requires_upfront_payment: false,
        is_active: true,
      };

      it('should accept valid service', () => {
        expect(serviceSchema.safeParse(validService).success).toBe(true);
      });

      it('should reject invalid service name characters', () => {
        const data = { ...validService, name: 'Service <script>' };
        expect(serviceSchema.safeParse(data).success).toBe(false);
      });

      it('should reject negative price', () => {
        const data = { ...validService, price: -50 };
        expect(serviceSchema.safeParse(data).success).toBe(false);
      });

      it('should accept all currency types', () => {
        const currencies = ['EUR', 'USD', 'GBP'] as const;
        currencies.forEach(currency => {
          const data = { ...validService, currency };
          expect(serviceSchema.safeParse(data).success).toBe(true);
        });
      });

      it('should reject duration less than 5 minutes', () => {
        const data = { ...validService, duration_minutes: 3 };
        expect(serviceSchema.safeParse(data).success).toBe(false);
      });

      it('should reject duration more than 8 hours', () => {
        const data = { ...validService, duration_minutes: 500 };
        expect(serviceSchema.safeParse(data).success).toBe(false);
      });
    });

    describe('servicesArraySchema', () => {
      it('should accept array of valid services', () => {
        const services = [
          { name: 'Service 1', price: 50 },
          { name: 'Service 2', price: 100, duration: 60 },
        ];
        expect(servicesArraySchema.safeParse(services).success).toBe(true);
      });

      it('should reject empty array', () => {
        expect(servicesArraySchema.safeParse([]).success).toBe(false);
      });

      it('should reject array with more than 50 services', () => {
        const services = Array.from({ length: 51 }, (_, i) => ({
          name: `Service ${i}`,
          price: 50,
        }));
        expect(servicesArraySchema.safeParse(services).success).toBe(false);
      });
    });
  });

  describe('Payment & Inventory Schemas', () => {
    describe('paymentRequestSchema', () => {
      const validPayment = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        amountCents: 5000,
        description: 'Payment for dental cleaning',
      };

      it('should accept valid payment request', () => {
        expect(paymentRequestSchema.safeParse(validPayment).success).toBe(true);
      });

      it('should reject non-positive amount', () => {
        expect(paymentRequestSchema.safeParse({ ...validPayment, amountCents: 0 }).success).toBe(false);
        expect(paymentRequestSchema.safeParse({ ...validPayment, amountCents: -100 }).success).toBe(false);
      });
    });

    describe('inventoryItemSchema', () => {
      const validItem = {
        name: 'Dental Gloves',
        category: 'Supplies',
        quantity: 100,
        minThreshold: 20,
        unitCostCents: 50,
        supplier: 'Medical Supplies Co',
      };

      it('should accept valid inventory item', () => {
        expect(inventoryItemSchema.safeParse(validItem).success).toBe(true);
      });

      it('should reject negative quantity', () => {
        const data = { ...validItem, quantity: -5 };
        expect(inventoryItemSchema.safeParse(data).success).toBe(false);
      });

      it('should reject negative threshold', () => {
        const data = { ...validItem, minThreshold: -1 };
        expect(inventoryItemSchema.safeParse(data).success).toBe(false);
      });
    });
  });

  describe('Notification & Chat Schemas', () => {
    describe('notificationPreferencesSchema', () => {
      const validPrefs = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        appointmentReminders: true,
        promotions: false,
        newsletters: false,
      };

      it('should accept valid preferences', () => {
        expect(notificationPreferencesSchema.safeParse(validPrefs).success).toBe(true);
      });

      it('should accept optional quiet hours', () => {
        const data = {
          ...validPrefs,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        };
        expect(notificationPreferencesSchema.safeParse(data).success).toBe(true);
      });
    });

    describe('chatMessageSchema', () => {
      it('should accept valid message', () => {
        expect(chatMessageSchema.safeParse({ message: 'Hello!' }).success).toBe(true);
      });

      it('should reject empty message', () => {
        expect(chatMessageSchema.safeParse({ message: '' }).success).toBe(false);
      });

      it('should reject message that is too long', () => {
        const longMessage = 'a'.repeat(5001);
        expect(chatMessageSchema.safeParse({ message: longMessage }).success).toBe(false);
      });

      it('should accept optional attachments', () => {
        const data = {
          message: 'See attached',
          attachments: ['file1.pdf', 'file2.jpg'],
        };
        expect(chatMessageSchema.safeParse(data).success).toBe(true);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateData', () => {
      it('should return success with valid data', () => {
        const result = validateData(emailSchema, 'test@example.com');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('test@example.com');
        }
      });

      it('should return errors with invalid data', () => {
        const result = validateData(emailSchema, 'invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect((result as any).errors).toBeDefined();
          expect(Object.keys((result as any).errors).length).toBeGreaterThan(0);
        }
      });

      it('should handle nested validation errors', () => {
        const schema = z.object({
          user: z.object({
            email: emailSchema,
          }),
        });
        const result = validateData(schema, { user: { email: 'invalid' } });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors['user.email']).toBeDefined();
        }
      });
    });

    describe('getValidationErrorMessages', () => {
      it('should extract error messages from ZodError', () => {
        const result = emailSchema.safeParse('invalid');
        if (!result.success) {
          const messages = getValidationErrorMessages(result.error);
          expect(messages['']).toBeDefined();
        }
      });
    });

    describe('sanitizeString', () => {
      it('should trim whitespace', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
      });

      it('should remove control characters', () => {
        // Control characters are removed entirely (not replaced with space)
        expect(sanitizeString('hello\x00world')).toBe('helloworld');
        expect(sanitizeString('test\x1Fvalue')).toBe('testvalue');
      });

      it('should normalize whitespace', () => {
        expect(sanitizeString('hello   world')).toBe('hello world');
        expect(sanitizeString('multiple    spaces')).toBe('multiple spaces');
      });

      it('should handle null and undefined', () => {
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
      });
    });

    describe('sanitizeServiceData', () => {
      it('should sanitize service fields', () => {
        const data = {
          name: '  Test Service  ',
          description: '  Description  ',
          category: '  Category  ',
          price: 100,
        };
        const sanitized = sanitizeServiceData(data);
        expect(sanitized.name).toBe('Test Service');
        expect(sanitized.description).toBe('Description');
        expect(sanitized.category).toBe('Category');
        expect(sanitized.price).toBe(100);
      });

      it('should handle null description and category', () => {
        const data = {
          name: 'Test',
          description: null,
          category: null,
          price: 50,
        };
        const sanitized = sanitizeServiceData(data);
        expect(sanitized.description).toBeNull();
        expect(sanitized.category).toBeNull();
      });
    });
  });
});
