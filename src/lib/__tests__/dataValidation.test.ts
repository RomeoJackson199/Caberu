/**
 * Tests for dataValidation.ts - Data validation utilities
 */

import {
  safeGet,
  hasRequiredFields,
  getPatientName,
  getProviderName,
  safeFormatDate,
  isValidEmail,
  isValidPhone,
  ensureArray,
  safeJsonParse,
  isValidNumber,
  clamp,
  sanitizeInput,
  validateAppointment,
  deepClone,
} from '../dataValidation';

describe('dataValidation.ts', () => {
  describe('safeGet', () => {
    it('should get nested property', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(safeGet(obj, 'user.profile.name', 'default')).toBe('John');
    });

    it('should return default for missing property', () => {
      const obj = { user: {} };
      expect(safeGet(obj, 'user.profile.name', 'default')).toBe('default');
    });

    it('should return default for null object', () => {
      expect(safeGet(null, 'user.name', 'default')).toBe('default');
    });

    it('should return default for undefined object', () => {
      expect(safeGet(undefined, 'user.name', 'default')).toBe('default');
    });

    it('should handle single level property', () => {
      const obj = { name: 'John' };
      expect(safeGet(obj, 'name', 'default')).toBe('John');
    });

    it('should return default for non-object', () => {
      expect(safeGet('string', 'prop', 'default')).toBe('default');
      expect(safeGet(123, 'prop', 'default')).toBe('default');
    });

    it('should handle null values in path', () => {
      const obj = { user: null };
      expect(safeGet(obj, 'user.name', 'default')).toBe('default');
    });
  });

  describe('hasRequiredFields', () => {
    it('should return true when all fields exist', () => {
      const obj = { name: 'John', email: 'john@example.com', age: 30 };
      expect(hasRequiredFields(obj, ['name', 'email'])).toBe(true);
    });

    it('should return false when field is missing', () => {
      const obj = { name: 'John' };
      expect(hasRequiredFields(obj, ['name', 'email'])).toBe(false);
    });

    it('should return false for null object', () => {
      expect(hasRequiredFields(null, ['name'])).toBe(false);
    });

    it('should return false for undefined object', () => {
      expect(hasRequiredFields(undefined, ['name'])).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(hasRequiredFields('string', ['length'])).toBe(false);
    });

    it('should return false when field is empty string', () => {
      const obj = { name: '' };
      expect(hasRequiredFields(obj, ['name'])).toBe(false);
    });

    it('should return false when field is null', () => {
      const obj = { name: null };
      expect(hasRequiredFields(obj, ['name'])).toBe(false);
    });

    it('should handle nested fields', () => {
      const obj = { user: { name: 'John' } };
      expect(hasRequiredFields(obj, ['user.name'])).toBe(true);
      expect(hasRequiredFields(obj, ['user.email'])).toBe(false);
    });

    it('should return true for empty fields array', () => {
      const obj = { name: 'John' };
      expect(hasRequiredFields(obj, [])).toBe(true);
    });
  });

  describe('getPatientName', () => {
    it('should return full name from first_name and last_name', () => {
      const patient = { first_name: 'John', last_name: 'Doe' };
      expect(getPatientName(patient)).toBe('John Doe');
    });

    it('should handle camelCase properties', () => {
      const patient = { firstName: 'Jane', lastName: 'Smith' };
      expect(getPatientName(patient)).toBe('Jane Smith');
    });

    it('should return first name only when last name is missing', () => {
      const patient = { first_name: 'John' };
      expect(getPatientName(patient)).toBe('John');
    });

    it('should return last name only when first name is missing', () => {
      const patient = { last_name: 'Doe' };
      expect(getPatientName(patient)).toBe('Doe');
    });

    it('should extract name from email when names are missing', () => {
      const patient = { email: 'john.doe@example.com' };
      expect(getPatientName(patient as any)).toBe('John Doe');
    });

    it('should handle email with underscores', () => {
      const patient = { email: 'john_doe@example.com' };
      expect(getPatientName(patient as any)).toBe('John Doe');
    });

    it('should remove numbers from email-derived names', () => {
      const patient = { email: 'john123@example.com' };
      expect(getPatientName(patient as any)).toBe('John');
    });

    it('should return "Unknown Patient" for null', () => {
      expect(getPatientName(null)).toBe('Unknown Patient');
    });

    it('should return "Unknown Patient" for undefined', () => {
      expect(getPatientName(undefined)).toBe('Unknown Patient');
    });

    it('should return "Unknown Patient" when no name info available', () => {
      const patient = {};
      expect(getPatientName(patient)).toBe('Unknown Patient');
    });
  });

  describe('getProviderName', () => {
    it('should return full name from profile', () => {
      const provider = { profiles: { first_name: 'Dr. John', last_name: 'Smith' } };
      expect(getProviderName(provider)).toBe('Dr. John Smith');
    });

    it('should handle nested profile object', () => {
      const provider = { profile: { first_name: 'Jane', last_name: 'Doe' } };
      expect(getProviderName(provider)).toBe('Jane Doe');
    });

    it('should handle flat structure', () => {
      const provider = { first_name: 'John', last_name: 'Doe' };
      expect(getProviderName(provider)).toBe('John Doe');
    });

    it('should return "Unassigned" for null', () => {
      expect(getProviderName(null)).toBe('Unassigned');
    });

    it('should return "Unassigned" for undefined', () => {
      expect(getProviderName(undefined)).toBe('Unassigned');
    });

    it('should return "Unassigned Provider" when no names available', () => {
      const provider = { profiles: {} };
      expect(getProviderName(provider)).toBe('Unassigned Provider');
    });
  });

  describe('safeFormatDate', () => {
    it('should format valid date string', () => {
      const result = safeFormatDate('2024-01-15T10:30:00.000Z');
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should format Date object', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const result = safeFormatDate(date);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return default for null', () => {
      expect(safeFormatDate(null)).toBe('N/A');
    });

    it('should return default for undefined', () => {
      expect(safeFormatDate(undefined)).toBe('N/A');
    });

    it('should return custom default value', () => {
      expect(safeFormatDate(null, 'No date')).toBe('No date');
    });

    it('should return default for invalid date string', () => {
      expect(safeFormatDate('invalid')).toBe('N/A');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@gmail.com')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidEmail(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidEmail(undefined)).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(isValidEmail(123 as any)).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should return true for valid phone numbers', () => {
      expect(isValidPhone('+32471123456')).toBe(true);
      expect(isValidPhone('+1-555-123-4567')).toBe(true);
      expect(isValidPhone('(555) 123-4567')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhone('abc')).toBe(false);
      expect(isValidPhone('123')).toBe(false); // Too short
    });

    it('should return false for null', () => {
      expect(isValidPhone(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidPhone(undefined)).toBe(false);
    });
  });

  describe('ensureArray', () => {
    it('should return same array if already array', () => {
      const arr = [1, 2, 3];
      expect(ensureArray(arr)).toEqual([1, 2, 3]);
    });

    it('should wrap single value in array', () => {
      expect(ensureArray('test')).toEqual(['test']);
      expect(ensureArray(42)).toEqual([42]);
    });

    it('should return empty array for null', () => {
      expect(ensureArray(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(ensureArray(undefined)).toEqual([]);
    });

    it('should handle objects', () => {
      const obj = { name: 'test' };
      expect(ensureArray(obj)).toEqual([obj]);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      expect(safeJsonParse('{"name":"John"}', {})).toEqual({ name: 'John' });
      expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
    });

    it('should return default for invalid JSON', () => {
      expect(safeJsonParse('invalid', { default: true })).toEqual({ default: true });
    });

    it('should return default for null', () => {
      expect(safeJsonParse(null, 'default')).toBe('default');
    });

    it('should return default for undefined', () => {
      expect(safeJsonParse(undefined, 'default')).toBe('default');
    });

    it('should return default for non-string', () => {
      expect(safeJsonParse(123 as any, 'default')).toBe('default');
    });
  });

  describe('isValidNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isValidNumber(42)).toBe(true);
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(-5)).toBe(true);
      expect(isValidNumber(3.14)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isValidNumber('42')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
    });
  });

  describe('clamp', () => {
    it('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min when value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max when value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
      expect(clamp(5, 5, 5)).toBe(5);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(0, -10, -1)).toBe(-1);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML characters', () => {
      expect(sanitizeInput('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeInput('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should return empty string for null', () => {
      expect(sanitizeInput(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(sanitizeInput(undefined)).toBe('');
    });

    it('should return empty string for non-string', () => {
      expect(sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('validateAppointment', () => {
    const validAppointment = {
      patient_id: 'patient-123',
      dentist_id: 'dentist-456',
      appointment_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      duration_minutes: 30,
      business_id: 'business-789',
    };

    it('should validate correct appointment', () => {
      const result = validateAppointment(validAppointment);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require patient_id', () => {
      const appointment = { ...validAppointment, patient_id: '' };
      const result = validateAppointment(appointment);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patient is required');
    });

    it('should require dentist_id', () => {
      const appointment = { ...validAppointment, dentist_id: '' };
      const result = validateAppointment(appointment);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dentist is required');
    });

    it('should require appointment_date', () => {
      const appointment = { ...validAppointment, appointment_date: '' };
      const result = validateAppointment(appointment);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Appointment date is required');
    });

    it('should reject invalid appointment_date', () => {
      const appointment = { ...validAppointment, appointment_date: 'invalid' };
      const result = validateAppointment(appointment);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid appointment date');
    });

    it('should reject past appointment_date', () => {
      const appointment = { ...validAppointment, appointment_date: '2020-01-01T10:00:00.000Z' };
      const result = validateAppointment(appointment);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Appointment date cannot be in the past');
    });

    it('should require valid duration_minutes', () => {
      const appointment = { ...validAppointment, duration_minutes: 0 };
      const result = validateAppointment(appointment);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid duration is required');
    });

    it('should require business_id', () => {
      const appointment = { ...validAppointment, business_id: '' };
      const result = validateAppointment(appointment);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Business is required');
    });
  });

  describe('deepClone', () => {
    it('should clone simple objects', () => {
      const obj = { name: 'John', age: 30 };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { user: { profile: { name: 'John' } } };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone.user).not.toBe(obj.user);
      expect(clone.user.profile).not.toBe(obj.user.profile);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, { name: 'test' }];
      const clone = deepClone(arr);
      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
      expect(clone[2]).not.toBe(arr[2]);
    });

    it('should clone Date objects', () => {
      const date = new Date('2024-01-15');
      const clone = deepClone(date);
      expect(clone).toEqual(date);
      expect(clone).not.toBe(date);
      expect(clone.getTime()).toBe(date.getTime());
    });

    it('should handle null', () => {
      expect(deepClone(null)).toBeNull();
    });

    it('should handle primitives', () => {
      expect(deepClone('string')).toBe('string');
      expect(deepClone(42)).toBe(42);
      expect(deepClone(true)).toBe(true);
    });
  });
});
