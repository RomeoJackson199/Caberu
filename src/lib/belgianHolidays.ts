/**
 * Belgian Public Holidays
 *
 * Belgium has 10 official public holidays. This module provides
 * functions to check if a date falls on a Belgian public holiday.
 *
 * Public holidays in Belgium:
 * - Fixed: New Year's Day (Jan 1), Labour Day (May 1), Belgian National Day (July 21),
 *          Assumption (Aug 15), All Saints (Nov 1), Armistice Day (Nov 11), Christmas (Dec 25)
 * - Variable: Easter Monday, Ascension Day (39 days after Easter), Whit Monday (50 days after Easter)
 */

import { startOfDay, addDays, getYear, getMonth, getDate, isEqual } from 'date-fns';

interface Holiday {
  name: string;
  date: Date;
  nameNl: string;
  nameFr: string;
}

/**
 * Calculate Easter Sunday for a given year using the Anonymous Gregorian algorithm
 * This is the most widely used algorithm for computing Easter dates
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Get all Belgian public holidays for a given year
 */
export function getBelgianHolidays(year: number): Holiday[] {
  const easterSunday = getEasterSunday(year);

  return [
    {
      name: "New Year's Day",
      nameNl: "Nieuwjaar",
      nameFr: "Jour de l'An",
      date: new Date(year, 0, 1), // January 1
    },
    {
      name: "Easter Monday",
      nameNl: "Paasmaandag",
      nameFr: "Lundi de Pâques",
      date: addDays(easterSunday, 1), // Day after Easter
    },
    {
      name: "Labour Day",
      nameNl: "Dag van de Arbeid",
      nameFr: "Fête du Travail",
      date: new Date(year, 4, 1), // May 1
    },
    {
      name: "Ascension Day",
      nameNl: "Onze Lieve Heer Hemelvaart",
      nameFr: "Ascension",
      date: addDays(easterSunday, 39), // 39 days after Easter
    },
    {
      name: "Whit Monday",
      nameNl: "Pinkstermaandag",
      nameFr: "Lundi de Pentecôte",
      date: addDays(easterSunday, 50), // 50 days after Easter
    },
    {
      name: "Belgian National Day",
      nameNl: "Nationale Feestdag",
      nameFr: "Fête Nationale",
      date: new Date(year, 6, 21), // July 21
    },
    {
      name: "Assumption of Mary",
      nameNl: "Onze Lieve Vrouw Hemelvaart",
      nameFr: "Assomption",
      date: new Date(year, 7, 15), // August 15
    },
    {
      name: "All Saints' Day",
      nameNl: "Allerheiligen",
      nameFr: "Toussaint",
      date: new Date(year, 10, 1), // November 1
    },
    {
      name: "Armistice Day",
      nameNl: "Wapenstilstand",
      nameFr: "Armistice",
      date: new Date(year, 10, 11), // November 11
    },
    {
      name: "Christmas Day",
      nameNl: "Kerstmis",
      nameFr: "Noël",
      date: new Date(year, 11, 25), // December 25
    },
  ];
}

/**
 * Check if a given date is a Belgian public holiday
 * @param date The date to check
 * @returns The holiday object if it's a holiday, null otherwise
 */
export function isBelgianHoliday(date: Date): Holiday | null {
  const normalizedDate = startOfDay(date);
  const year = getYear(normalizedDate);
  const holidays = getBelgianHolidays(year);

  return holidays.find(holiday =>
    isEqual(startOfDay(holiday.date), normalizedDate)
  ) || null;
}

/**
 * Check if a given date is a Belgian public holiday (boolean version)
 * @param date The date to check
 * @returns true if the date is a Belgian public holiday
 */
export function isPublicHoliday(date: Date): boolean {
  return isBelgianHoliday(date) !== null;
}

/**
 * Get the name of the holiday for a given date
 * @param date The date to check
 * @param language The language for the holiday name ('en', 'nl', or 'fr')
 * @returns The holiday name or null if not a holiday
 */
export function getHolidayName(date: Date, language: 'en' | 'nl' | 'fr' = 'en'): string | null {
  const holiday = isBelgianHoliday(date);
  if (!holiday) return null;

  switch (language) {
    case 'nl':
      return holiday.nameNl;
    case 'fr':
      return holiday.nameFr;
    default:
      return holiday.name;
  }
}

/**
 * Get all Belgian public holidays for a date range
 * @param startDate Start of the date range
 * @param endDate End of the date range
 * @returns Array of holidays within the date range
 */
export function getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
  const startYear = getYear(startDate);
  const endYear = getYear(endDate);
  const holidays: Holiday[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getBelgianHolidays(year);
    holidays.push(
      ...yearHolidays.filter(holiday =>
        holiday.date >= startOfDay(startDate) && holiday.date <= startOfDay(endDate)
      )
    );
  }

  return holidays;
}
