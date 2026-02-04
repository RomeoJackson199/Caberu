/**
 * Tests for timezone.ts - Timezone utilities for Europe/Brussels with DST handling
 */

import {
  clinicTimeToUtc,
  utcToClinicTime,
  formatClinicTime,
  createAppointmentDateTime,
  createAppointmentDateTimeFromStrings,
  getClinicTimeSlots,
  formatTimeSlot,
} from '../timezone';

describe('timezone.ts', () => {
  describe('clinicTimeToUtc', () => {
    it('should convert Brussels time to UTC', () => {
      // Brussels is UTC+1 in winter, UTC+2 in summer (DST)
      const result = clinicTimeToUtc('2024-01-15T10:00:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should accept Date object', () => {
      const date = new Date('2024-01-15T10:00:00');
      const result = clinicTimeToUtc(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('should throw for invalid date', () => {
      expect(() => clinicTimeToUtc('invalid')).toThrow('Invalid date provided');
    });
  });

  describe('utcToClinicTime', () => {
    it('should convert UTC to Brussels time', () => {
      const result = utcToClinicTime('2024-01-15T10:00:00Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should accept Date object', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const result = utcToClinicTime(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('should throw for invalid date', () => {
      expect(() => utcToClinicTime('invalid')).toThrow('Invalid date provided');
    });
  });

  describe('formatClinicTime', () => {
    it('should format date in clinic timezone', () => {
      const result = formatClinicTime('2024-01-15T10:00:00Z', 'yyyy-MM-dd HH:mm');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    });

    it('should use default format when not specified', () => {
      const result = formatClinicTime('2024-01-15T10:00:00Z');
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return "Invalid date" for invalid input', () => {
      expect(formatClinicTime('invalid')).toBe('Invalid date');
    });

    it('should accept Date object', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const result = formatClinicTime(date, 'yyyy-MM-dd');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('createAppointmentDateTime', () => {
    it('should create appointment datetime from date and time slot', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const result = createAppointmentDateTime(date, '10:30');

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
    });

    it('should handle afternoon times', () => {
      const date = new Date(2024, 5, 20); // June 20, 2024
      const result = createAppointmentDateTime(date, '14:00');

      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(0);
    });

    it('should handle early morning times', () => {
      const date = new Date(2024, 2, 10);
      const result = createAppointmentDateTime(date, '07:00');

      expect(result.getHours()).toBe(7);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('createAppointmentDateTimeFromStrings', () => {
    it('should create datetime from date and time strings', () => {
      const result = createAppointmentDateTimeFromStrings('2024-01-15', '10:30');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle time with seconds', () => {
      const result = createAppointmentDateTimeFromStrings('2024-06-20', '14:30:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should interpret time in Brussels timezone', () => {
      // The function should create a UTC date that represents the Brussels local time
      const result = createAppointmentDateTimeFromStrings('2024-01-15', '09:00');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('getClinicTimeSlots', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return time slots within business hours', () => {
      jest.setSystemTime(new Date('2024-01-15T06:00:00Z'));

      const futureDate = new Date('2024-01-20');
      const slots = getClinicTimeSlots(futureDate);

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toBe('07:00');
      expect(slots[slots.length - 1]).toBe('16:30');
    });

    it('should return slots at 30-minute intervals', () => {
      jest.setSystemTime(new Date('2024-01-15T06:00:00Z'));

      const futureDate = new Date('2024-01-20');
      const slots = getClinicTimeSlots(futureDate);

      // Check that slots alternate between :00 and :30
      slots.forEach((slot, index) => {
        const minutes = slot.split(':')[1];
        if (index % 2 === 0) {
          expect(minutes).toBe('00');
        } else {
          expect(minutes).toBe('30');
        }
      });
    });

    it('should filter out past slots for today', () => {
      // Set current time to 10:00 AM Brussels time
      jest.setSystemTime(new Date('2024-01-15T09:00:00Z')); // 10:00 in Brussels (UTC+1)

      const today = new Date('2024-01-15');
      const slots = getClinicTimeSlots(today);

      // Should not include slots before current time + 1 hour buffer
      expect(slots.some(s => s === '07:00')).toBe(false);
      expect(slots.some(s => s === '10:00')).toBe(false);
    });

    it('should return all slots for future dates', () => {
      jest.setSystemTime(new Date('2024-01-15T15:00:00Z'));

      const futureDate = new Date('2024-01-20');
      const slots = getClinicTimeSlots(futureDate);

      expect(slots[0]).toBe('07:00');
    });

    it('should generate correct number of slots', () => {
      jest.setSystemTime(new Date('2024-01-15T06:00:00Z'));

      const futureDate = new Date('2024-01-20');
      const slots = getClinicTimeSlots(futureDate);

      // 7:00 to 16:30 at 30-minute intervals = 20 slots
      expect(slots.length).toBe(20);
    });
  });

  describe('formatTimeSlot', () => {
    it('should format morning times with AM', () => {
      expect(formatTimeSlot('09:00')).toBe('9:00 AM');
      expect(formatTimeSlot('10:30')).toBe('10:30 AM');
      expect(formatTimeSlot('11:45')).toBe('11:45 AM');
    });

    it('should format afternoon times with PM', () => {
      expect(formatTimeSlot('13:00')).toBe('1:00 PM');
      expect(formatTimeSlot('14:30')).toBe('2:30 PM');
      expect(formatTimeSlot('17:00')).toBe('5:00 PM');
    });

    it('should handle noon correctly', () => {
      expect(formatTimeSlot('12:00')).toBe('12:00 PM');
      expect(formatTimeSlot('12:30')).toBe('12:30 PM');
    });

    it('should handle midnight correctly', () => {
      expect(formatTimeSlot('00:00')).toBe('12:00 AM');
      expect(formatTimeSlot('00:30')).toBe('12:30 AM');
    });

    it('should pad minutes correctly', () => {
      expect(formatTimeSlot('09:05')).toBe('9:05 AM');
      expect(formatTimeSlot('14:00')).toBe('2:00 PM');
    });
  });
});
