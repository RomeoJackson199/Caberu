/**
 * Tests for belgianHolidays.ts - Belgian public holidays
 */

import {
  getBelgianHolidays,
  isBelgianHoliday,
  isPublicHoliday,
  getHolidayName,
  getHolidaysInRange,
} from '../belgianHolidays';

describe('belgianHolidays.ts', () => {
  describe('getBelgianHolidays', () => {
    it('should return 10 holidays for any year', () => {
      const holidays2024 = getBelgianHolidays(2024);
      expect(holidays2024).toHaveLength(10);
    });

    it('should include all fixed holidays', () => {
      const holidays = getBelgianHolidays(2024);
      const holidayNames = holidays.map(h => h.name);

      expect(holidayNames).toContain("New Year's Day");
      expect(holidayNames).toContain("Labour Day");
      expect(holidayNames).toContain("Belgian National Day");
      expect(holidayNames).toContain("Assumption of Mary");
      expect(holidayNames).toContain("All Saints' Day");
      expect(holidayNames).toContain("Armistice Day");
      expect(holidayNames).toContain("Christmas Day");
    });

    it('should include Easter-based holidays', () => {
      const holidays = getBelgianHolidays(2024);
      const holidayNames = holidays.map(h => h.name);

      expect(holidayNames).toContain("Easter Monday");
      expect(holidayNames).toContain("Ascension Day");
      expect(holidayNames).toContain("Whit Monday");
    });

    it('should have correct fixed holiday dates', () => {
      const holidays = getBelgianHolidays(2024);

      const newYear = holidays.find(h => h.name === "New Year's Day");
      expect(newYear?.date.getMonth()).toBe(0); // January
      expect(newYear?.date.getDate()).toBe(1);

      const labourDay = holidays.find(h => h.name === "Labour Day");
      expect(labourDay?.date.getMonth()).toBe(4); // May
      expect(labourDay?.date.getDate()).toBe(1);

      const nationalDay = holidays.find(h => h.name === "Belgian National Day");
      expect(nationalDay?.date.getMonth()).toBe(6); // July
      expect(nationalDay?.date.getDate()).toBe(21);

      const christmas = holidays.find(h => h.name === "Christmas Day");
      expect(christmas?.date.getMonth()).toBe(11); // December
      expect(christmas?.date.getDate()).toBe(25);
    });

    it('should have translations for all holidays', () => {
      const holidays = getBelgianHolidays(2024);

      holidays.forEach(holiday => {
        expect(holiday.name).toBeTruthy();
        expect(holiday.nameNl).toBeTruthy();
        expect(holiday.nameFr).toBeTruthy();
      });
    });

    it('should calculate Easter Monday correctly for 2024', () => {
      // Easter Sunday 2024 is March 31
      const holidays = getBelgianHolidays(2024);
      const easterMonday = holidays.find(h => h.name === "Easter Monday");

      expect(easterMonday?.date.getMonth()).toBe(3); // April
      expect(easterMonday?.date.getDate()).toBe(1); // April 1
    });

    it('should calculate Ascension Day correctly (39 days after Easter)', () => {
      const holidays = getBelgianHolidays(2024);
      const ascension = holidays.find(h => h.name === "Ascension Day");

      // Easter Sunday 2024 is March 31, Ascension is May 9
      expect(ascension?.date.getMonth()).toBe(4); // May
      expect(ascension?.date.getDate()).toBe(9);
    });

    it('should calculate Whit Monday correctly (50 days after Easter)', () => {
      const holidays = getBelgianHolidays(2024);
      const whitMonday = holidays.find(h => h.name === "Whit Monday");

      // Easter Sunday 2024 is March 31, Whit Monday is May 20
      expect(whitMonday?.date.getMonth()).toBe(4); // May
      expect(whitMonday?.date.getDate()).toBe(20);
    });
  });

  describe('isBelgianHoliday', () => {
    it('should return holiday object for holidays', () => {
      const newYear = new Date(2024, 0, 1);
      const result = isBelgianHoliday(newYear);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("New Year's Day");
    });

    it('should return null for non-holidays', () => {
      const regularDay = new Date(2024, 2, 15); // March 15
      expect(isBelgianHoliday(regularDay)).toBeNull();
    });

    it('should handle time component in date', () => {
      // Should work regardless of time
      const christmasWithTime = new Date(2024, 11, 25, 14, 30, 0);
      const result = isBelgianHoliday(christmasWithTime);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Christmas Day");
    });

    it('should work for different years', () => {
      const christmas2023 = new Date(2023, 11, 25);
      const christmas2025 = new Date(2025, 11, 25);

      expect(isBelgianHoliday(christmas2023)).not.toBeNull();
      expect(isBelgianHoliday(christmas2025)).not.toBeNull();
    });
  });

  describe('isPublicHoliday', () => {
    it('should return true for public holidays', () => {
      expect(isPublicHoliday(new Date(2024, 0, 1))).toBe(true); // New Year
      expect(isPublicHoliday(new Date(2024, 4, 1))).toBe(true); // Labour Day
      expect(isPublicHoliday(new Date(2024, 6, 21))).toBe(true); // Belgian National Day
      expect(isPublicHoliday(new Date(2024, 11, 25))).toBe(true); // Christmas
    });

    it('should return false for non-holidays', () => {
      expect(isPublicHoliday(new Date(2024, 1, 15))).toBe(false);
      expect(isPublicHoliday(new Date(2024, 5, 10))).toBe(false);
      expect(isPublicHoliday(new Date(2024, 8, 20))).toBe(false);
    });
  });

  describe('getHolidayName', () => {
    it('should return English name by default', () => {
      const christmas = new Date(2024, 11, 25);
      expect(getHolidayName(christmas)).toBe("Christmas Day");
    });

    it('should return Dutch name when requested', () => {
      const christmas = new Date(2024, 11, 25);
      expect(getHolidayName(christmas, 'nl')).toBe("Kerstmis");
    });

    it('should return French name when requested', () => {
      const christmas = new Date(2024, 11, 25);
      expect(getHolidayName(christmas, 'fr')).toBe("Noël");
    });

    it('should return null for non-holidays', () => {
      const regularDay = new Date(2024, 2, 15);
      expect(getHolidayName(regularDay)).toBeNull();
    });

    it('should return correct translations for all holidays', () => {
      const labourDay = new Date(2024, 4, 1);

      expect(getHolidayName(labourDay, 'en')).toBe("Labour Day");
      expect(getHolidayName(labourDay, 'nl')).toBe("Dag van de Arbeid");
      expect(getHolidayName(labourDay, 'fr')).toBe("Fête du Travail");
    });
  });

  describe('getHolidaysInRange', () => {
    it('should return holidays within date range', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 2, 31); // End of March

      const holidays = getHolidaysInRange(startDate, endDate);

      expect(holidays.length).toBeGreaterThan(0);

      // Should include New Year's Day
      expect(holidays.some(h => h.name === "New Year's Day")).toBe(true);
    });

    it('should return empty array for range with no holidays', () => {
      const startDate = new Date(2024, 1, 2); // Feb 2
      const endDate = new Date(2024, 2, 30); // Before Easter 2024

      const holidays = getHolidaysInRange(startDate, endDate);

      expect(holidays).toEqual([]);
    });

    it('should include holidays exactly on boundaries', () => {
      const startDate = new Date(2024, 11, 25); // Christmas
      const endDate = new Date(2024, 11, 25); // Christmas

      const holidays = getHolidaysInRange(startDate, endDate);

      expect(holidays.length).toBe(1);
      expect(holidays[0].name).toBe("Christmas Day");
    });

    it('should handle ranges spanning multiple years', () => {
      const startDate = new Date(2023, 11, 1);
      const endDate = new Date(2024, 1, 28);

      const holidays = getHolidaysInRange(startDate, endDate);

      // Should include Christmas 2023 and New Year's Day 2024
      expect(holidays.some(h => h.name === "Christmas Day")).toBe(true);
      expect(holidays.some(h => h.name === "New Year's Day")).toBe(true);
    });

    it('should return all 10 holidays when range covers full year', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 11, 31);

      const holidays = getHolidaysInRange(startDate, endDate);

      expect(holidays.length).toBe(10);
    });
  });

  describe('Easter calculation', () => {
    // Test known Easter dates to verify the algorithm
    it('should calculate Easter correctly for various years', () => {
      // Known Easter Sunday dates
      const knownEasterDates = [
        { year: 2020, month: 3, day: 12 }, // April 12, 2020
        { year: 2021, month: 3, day: 4 },  // April 4, 2021
        { year: 2022, month: 3, day: 17 }, // April 17, 2022
        { year: 2023, month: 3, day: 9 },  // April 9, 2023
        { year: 2024, month: 2, day: 31 }, // March 31, 2024
        { year: 2025, month: 3, day: 20 }, // April 20, 2025
      ];

      knownEasterDates.forEach(({ year, month, day }) => {
        const holidays = getBelgianHolidays(year);
        const easterMonday = holidays.find(h => h.name === "Easter Monday");

        // Easter Monday is the day after Easter Sunday
        const expectedEasterMonday = new Date(year, month, day + 1);

        expect(easterMonday?.date.getFullYear()).toBe(expectedEasterMonday.getFullYear());
        expect(easterMonday?.date.getMonth()).toBe(expectedEasterMonday.getMonth());
        expect(easterMonday?.date.getDate()).toBe(expectedEasterMonday.getDate());
      });
    });
  });
});
