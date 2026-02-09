// Timezone utilities for Europe/Brussels with DST handling
import { format, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { isValid, startOfDay } from 'date-fns';

const CLINIC_TIMEZONE = 'Europe/Brussels';

/**
 * Convert local clinic time to UTC for database storage
 */
export function clinicTimeToUtc(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }
  return fromZonedTime(dateObj, CLINIC_TIMEZONE);
}

/**
 * Convert UTC time to local clinic time for display
 */
export function utcToClinicTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }
  return toZonedTime(dateObj, CLINIC_TIMEZONE);
}

/**
 * Format date in clinic timezone
 * 
 * IMPORTANT: The appointment_date from the database is stored as a UTC timestamp.
 * We need to convert it to Brussels local time for display, then format it.
 */
export function formatClinicTime(date: Date | string, formatStr: string = 'PPpp'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }
  // Convert UTC to Brussels timezone for display, then format
  const brusselsTime = toZonedTime(dateObj, CLINIC_TIMEZONE);
  return format(brusselsTime, formatStr);
}

/**
 * Create appointment datetime in clinic timezone
 * Takes a date and time string and correctly interprets them as Brussels time
 */
export function createAppointmentDateTime(date: Date, timeSlot: string): Date {
  // Extract date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Extract time components
  const [hours, minutes] = timeSlot.split(':').map(Number);

  // Create a string in ISO-like format and interpret as Brussels timezone
  const dateTimeString = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  return fromZonedTime(dateTimeString, CLINIC_TIMEZONE);
}

/**
 * Create appointment datetime from date string and time string
 * 
 * IMPORTANT: The slot times from the database are already in Brussels local time.
 * We create the appointment date/time WITHOUT any timezone conversion.
 * When stored in PostgreSQL with toISOString(), the browser's local offset is applied,
 * which for Belgium is correct since the user is in Belgium.
 */
export function createAppointmentDateTimeFromStrings(dateStr: string, timeStr: string): Date {
  // Parse date components from 'yyyy-MM-dd' format
  const [year, month, day] = dateStr.split('-').map(Number);

  // Parse time components from 'HH:mm' or 'HH:mm:ss' format
  const timeParts = timeStr.split(':').map(Number);
  const hours = timeParts[0];
  const minutes = timeParts[1] || 0;

  // Create string in ISO-like format without timezone: "YYYY-MM-DDTHH:mm:ss"
  const dateTimeString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

  // Interpret this string as being in the Clinic's timezone (Brussels)
  // This returns a Date object representing that absolute moment in time
  return fromZonedTime(dateTimeString, CLINIC_TIMEZONE);
}

/**
 * Get available time slots for a given date in clinic timezone
 */
export function getClinicTimeSlots(date: Date): string[] {
  const slots: string[] = [];
  const now = new Date();
  const clinicNow = utcToClinicTime(now);
  const selectedDay = startOfDay(date);
  const isToday = selectedDay.getTime() === startOfDay(clinicNow).getTime();

  // Business hours: 7:00 AM to 5:00 PM (17:00)
  for (let hour = 7; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // If it's today, only show future slots (with 1 hour buffer)
      if (isToday) {
        const slotDateTime = new Date(selectedDay);
        slotDateTime.setHours(hour, minute, 0, 0);
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        if (slotDateTime <= oneHourFromNow) {
          continue;
        }
      }

      slots.push(timeString);
    }
  }

  return slots;
}

/**
 * Format time slot for display (e.g., "09:00" -> "9:00 AM")
 */
export function formatTimeSlot(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}