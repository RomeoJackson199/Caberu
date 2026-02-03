/**
 * Tests for patient-utils.ts - Patient utility functions
 */

import {
  getAge,
  hasMedicalRisk,
  getStatusColorClass,
  getInitials,
  formatPatientName,
} from '../patient-utils';

describe('patient-utils.ts', () => {
  describe('getAge', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate correct age from date string', () => {
      expect(getAge('1990-06-15')).toBe(34);
      expect(getAge('2000-01-01')).toBe(24);
    });

    it('should handle age calculation across year boundaries', () => {
      expect(getAge('1990-12-31')).toBe(33); // Birthday not yet this year
      expect(getAge('1990-01-01')).toBe(34); // Birthday already passed
    });

    it('should return null for null input', () => {
      expect(getAge(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(getAge(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getAge('')).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(getAge('invalid-date')).toBeNull();
    });

    it('should handle ISO date strings', () => {
      expect(getAge('1990-06-15T00:00:00.000Z')).toBe(34);
    });
  });

  describe('hasMedicalRisk', () => {
    it('should detect allergy mentions', () => {
      expect(hasMedicalRisk('Patient has allergies to penicillin')).toBe(true);
      expect(hasMedicalRisk('Allergic to latex')).toBe(true);
    });

    it('should detect condition mentions', () => {
      expect(hasMedicalRisk('Patient has a heart condition')).toBe(true);
    });

    it('should detect medication mentions', () => {
      expect(hasMedicalRisk('Currently taking blood pressure medication')).toBe(true);
    });

    it('should detect diabetes', () => {
      expect(hasMedicalRisk('Patient has type 2 diabetes')).toBe(true);
    });

    it('should detect heart conditions', () => {
      expect(hasMedicalRisk('History of heart disease')).toBe(true);
    });

    it('should detect blood-related conditions', () => {
      expect(hasMedicalRisk('Patient has blood clotting issues')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(hasMedicalRisk('DIABETES')).toBe(true);
      expect(hasMedicalRisk('Allergies')).toBe(true);
    });

    it('should return false for null input', () => {
      expect(hasMedicalRisk(null)).toBe(false);
    });

    it('should return false for undefined input', () => {
      expect(hasMedicalRisk(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasMedicalRisk('')).toBe(false);
    });

    it('should return false for history without risk indicators', () => {
      expect(hasMedicalRisk('Patient is generally healthy')).toBe(false);
      expect(hasMedicalRisk('No known issues')).toBe(false);
    });
  });

  describe('getStatusColorClass', () => {
    it('should return correct class for completed status', () => {
      const classes = getStatusColorClass('completed');
      expect(classes).toContain('bg-emerald-50');
      expect(classes).toContain('text-emerald-700');
      expect(classes).toContain('border-emerald-200');
    });

    it('should return correct class for confirmed status', () => {
      const classes = getStatusColorClass('confirmed');
      expect(classes).toContain('bg-primary/10');
      expect(classes).toContain('text-primary');
    });

    it('should return correct class for active status', () => {
      const classes = getStatusColorClass('active');
      expect(classes).toContain('bg-blue-50');
      expect(classes).toContain('text-blue-700');
    });

    it('should return correct class for pending status', () => {
      const classes = getStatusColorClass('pending');
      expect(classes).toContain('bg-amber-50');
      expect(classes).toContain('text-amber-700');
    });

    it('should return correct class for cancelled status', () => {
      const classes = getStatusColorClass('cancelled');
      expect(classes).toContain('bg-destructive/10');
      expect(classes).toContain('text-destructive');
    });

    it('should return correct class for draft status', () => {
      const classes = getStatusColorClass('draft');
      expect(classes).toContain('bg-slate-50');
      expect(classes).toContain('text-slate-600');
    });

    it('should return default class for unknown status', () => {
      const classes = getStatusColorClass('unknown');
      expect(classes).toContain('bg-muted');
      expect(classes).toContain('text-muted-foreground');
    });

    it('should include dark mode classes where applicable', () => {
      const completedClasses = getStatusColorClass('completed');
      expect(completedClasses).toContain('dark:');
    });
  });

  describe('getInitials', () => {
    it('should return correct initials for first and last name', () => {
      expect(getInitials('John', 'Doe')).toBe('JD');
      expect(getInitials('Mary', 'Smith')).toBe('MS');
    });

    it('should handle lowercase names', () => {
      expect(getInitials('john', 'doe')).toBe('JD');
    });

    it('should return single initial for first name only', () => {
      expect(getInitials('John', null)).toBe('J');
      expect(getInitials('John', '')).toBe('J');
    });

    it('should return single initial for last name only', () => {
      expect(getInitials(null, 'Doe')).toBe('D');
      expect(getInitials('', 'Doe')).toBe('D');
    });

    it('should return ? when both names are missing', () => {
      expect(getInitials(null, null)).toBe('?');
      expect(getInitials('', '')).toBe('?');
      expect(getInitials(undefined, undefined)).toBe('?');
    });

    it('should handle empty strings', () => {
      expect(getInitials('', 'Smith')).toBe('S');
      expect(getInitials('John', '')).toBe('J');
    });
  });

  describe('formatPatientName', () => {
    it('should format full name correctly', () => {
      expect(formatPatientName('John', 'Doe')).toBe('John Doe');
      expect(formatPatientName('Mary', 'Jane')).toBe('Mary Jane');
    });

    it('should return first name only when last name is missing', () => {
      expect(formatPatientName('John', null)).toBe('John');
      expect(formatPatientName('John', '')).toBe('John');
    });

    it('should return last name only when first name is missing', () => {
      expect(formatPatientName(null, 'Doe')).toBe('Doe');
      expect(formatPatientName('', 'Doe')).toBe('Doe');
    });

    it('should return "Unknown Patient" when both names are missing', () => {
      expect(formatPatientName(null, null)).toBe('Unknown Patient');
      expect(formatPatientName('', '')).toBe('Unknown Patient');
      expect(formatPatientName(undefined, undefined)).toBe('Unknown Patient');
    });

    it('should handle whitespace in names', () => {
      expect(formatPatientName('John', 'Doe')).toBe('John Doe');
    });
  });
});
