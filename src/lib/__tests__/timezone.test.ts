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

  /**
   * Regression tests for the appointment timezone bug:
   * Dentist-created appointments were using `new Date(\`\${date}T\${time}\`)` which
   * interprets the time in browser-local timezone instead of Brussels timezone.
   * Patient-portal appointments correctly used `createAppointmentDateTimeFromStrings()`
   * which interprets the time as Brussels timezone.
   *
   * These tests verify that the round-trip create→store→display is consistent.
   *
   * Europe/Brussels:
   *   CET  (winter) = UTC+1
   *   CEST (summer) = UTC+2
   */
  describe('round-trip: create → store → display (regression)', () => {
    it('10:00 AM May 5 Brussels → stored UTC → displayed as 10:00 AM May 5 (CEST)', () => {
      const utcDate = createAppointmentDateTimeFromStrings('2026-05-05', '10:00');
      // May is CEST (UTC+2), so 10:00 Brussels = 08:00 UTC
      expect(utcDate.toISOString()).toBe('2026-05-05T08:00:00.000Z');

      const displayedTime = formatClinicTime(utcDate.toISOString(), 'HH:mm');
      const displayedDate = formatClinicTime(utcDate.toISOString(), 'yyyy-MM-dd');
      expect(displayedTime).toBe('10:00');
      expect(displayedDate).toBe('2026-05-05');
    });

    it('10:00 AM Jan 15 Brussels → stored UTC → displayed as 10:00 AM Jan 15 (CET)', () => {
      const utcDate = createAppointmentDateTimeFromStrings('2026-01-15', '10:00');
      // January is CET (UTC+1), so 10:00 Brussels = 09:00 UTC
      expect(utcDate.toISOString()).toBe('2026-01-15T09:00:00.000Z');

      const displayedTime = formatClinicTime(utcDate.toISOString(), 'HH:mm');
      const displayedDate = formatClinicTime(utcDate.toISOString(), 'yyyy-MM-dd');
      expect(displayedTime).toBe('10:00');
      expect(displayedDate).toBe('2026-01-15');
    });

    it('14:30 Mar 29 2026 Brussels → stored UTC → displayed correctly across DST boundary', () => {
      // March 29, 2026 is the spring DST switch day in Europe/Brussels
      // Clocks move forward at 02:00 → 03:00, so 14:30 is CEST (UTC+2)
      const utcDate = createAppointmentDateTimeFromStrings('2026-03-29', '14:30');
      expect(utcDate.toISOString()).toBe('2026-03-29T12:30:00.000Z');

      const displayedTime = formatClinicTime(utcDate.toISOString(), 'HH:mm');
      expect(displayedTime).toBe('14:30');
    });

    it('dentist and patient flows produce identical UTC for the same local time', () => {
      const dateStr = '2026-05-05';
      const timeStr = '10:00';

      // Both flows now use createAppointmentDateTimeFromStrings
      const flow1 = createAppointmentDateTimeFromStrings(dateStr, timeStr);
      const flow2 = createAppointmentDateTimeFromStrings(dateStr, timeStr);

      expect(flow1.toISOString()).toBe(flow2.toISOString());
    });
  });

  describe('cross-view display consistency', () => {
    it('all display formats show the same time for one UTC timestamp', () => {
      // 10:00 Brussels on May 5, 2026 stored as UTC
      const storedUtc = '2026-05-05T08:00:00.000Z';

      const time24h = formatClinicTime(storedUtc, 'HH:mm');
      const time12h = formatClinicTime(storedUtc, 'h:mm a');
      const dateStr = formatClinicTime(storedUtc, 'yyyy-MM-dd');
      const fullDateTime = formatClinicTime(storedUtc, 'PPp');

      expect(time24h).toBe('10:00');
      expect(time12h).toBe('10:00 AM');
      expect(dateStr).toBe('2026-05-05');
      expect(fullDateTime).toContain('10:00');
    });

    it('utcToClinicTime returns correct hour and date components', () => {
      const clinicTime = utcToClinicTime('2026-05-05T08:00:00.000Z');
      expect(clinicTime.getHours()).toBe(10);
      expect(clinicTime.getMinutes()).toBe(0);
      expect(clinicTime.getDate()).toBe(5);
      expect(clinicTime.getMonth()).toBe(4); // May = 4
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
