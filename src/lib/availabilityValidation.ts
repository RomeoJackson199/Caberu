/**
 * Availability Validation Utilities
 *
 * Shared validation logic for practitioner availability settings.
 * Used by both AvailabilitySettings and AvailabilityManager components.
 */

export interface DentistAvailability {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  break_start_time?: string | null;
  break_end_time?: string | null;
}

export interface ValidationError {
  dayOfWeek: number;
  field?: string;
  message: string;
}

export interface AffectedAppointment {
  id: string;
  appointment_date: string;
  patient_name: string;
  reason?: string;
}

// Day names for error messages (fallback, components should use translations)
const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

/**
 * Get the name of a day of week
 */
export function getDayName(dayOfWeek: number, translations?: Record<string, string>): string {
  if (translations) {
    const dayKey = DAY_NAMES[dayOfWeek]?.toLowerCase();
    if (dayKey && translations[dayKey]) {
      return translations[dayKey];
    }
  }
  return DAY_NAMES[dayOfWeek] || `Day ${dayOfWeek}`;
}

/**
 * Check if a shift is an overnight shift (end time is before start time)
 */
export function isOvernightShift(startTime: string, endTime: string): boolean {
  return endTime < startTime;
}

/**
 * Compare two time strings (HH:mm format)
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareTime(a: string, b: string): number {
  const [aHours, aMinutes] = a.split(':').map(Number);
  const [bHours, bMinutes] = b.split(':').map(Number);

  if (aHours !== bHours) {
    return aHours - bHours;
  }
  return aMinutes - bMinutes;
}

/**
 * Check if a time is within a range (handles overnight shifts)
 */
export function isTimeInRange(
  time: string,
  rangeStart: string,
  rangeEnd: string,
  isOvernight: boolean
): boolean {
  if (isOvernight) {
    // For overnight shifts, time is valid if >= start OR < end
    return compareTime(time, rangeStart) >= 0 || compareTime(time, rangeEnd) < 0;
  } else {
    // For normal shifts, time is valid if >= start AND < end
    return compareTime(time, rangeStart) >= 0 && compareTime(time, rangeEnd) < 0;
  }
}

/**
 * Validate a single day's availability settings
 */
export function validateDayAvailability(
  day: DentistAvailability,
  getDayNameFn?: (dayOfWeek: number) => string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const dayName = getDayNameFn ? getDayNameFn(day.day_of_week) : getDayName(day.day_of_week);

  // Skip validation for unavailable days
  if (!day.is_available) {
    return errors;
  }

  // Check that start and end times are not the same
  if (day.start_time === day.end_time) {
    errors.push({
      dayOfWeek: day.day_of_week,
      field: 'time',
      message: `${dayName}: Start and end time cannot be the same`,
    });
  }

  // Validate break times
  const hasBreakStart = !!day.break_start_time;
  const hasBreakEnd = !!day.break_end_time;

  // Both break times must be set or both empty
  if (hasBreakStart !== hasBreakEnd) {
    errors.push({
      dayOfWeek: day.day_of_week,
      field: 'break',
      message: `${dayName}: Both break start and end times must be set, or leave both empty`,
    });
  }

  if (hasBreakStart && hasBreakEnd) {
    const breakStart = day.break_start_time!;
    const breakEnd = day.break_end_time!;

    // Break end must be after break start
    if (compareTime(breakStart, breakEnd) >= 0) {
      errors.push({
        dayOfWeek: day.day_of_week,
        field: 'break',
        message: `${dayName}: Break end time must be after break start time`,
      });
    }

    // Check if it's a normal (non-overnight) shift
    const isOvernight = isOvernightShift(day.start_time, day.end_time);

    if (!isOvernight) {
      // Break must be within working hours for normal shifts
      if (compareTime(breakStart, day.start_time) < 0) {
        errors.push({
          dayOfWeek: day.day_of_week,
          field: 'break',
          message: `${dayName}: Break cannot start before working hours begin`,
        });
      }
      if (compareTime(breakEnd, day.end_time) > 0) {
        errors.push({
          dayOfWeek: day.day_of_week,
          field: 'break',
          message: `${dayName}: Break cannot end after working hours end`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate all availability settings
 */
export function validateAvailability(
  availability: DentistAvailability[],
  getDayNameFn?: (dayOfWeek: number) => string
): ValidationError[] {
  const allErrors: ValidationError[] = [];

  for (const day of availability) {
    const dayErrors = validateDayAvailability(day, getDayNameFn);
    allErrors.push(...dayErrors);
  }

  return allErrors;
}

/**
 * Check if an appointment time is within availability
 * Returns true if the appointment would be outside the new availability
 */
export function isAppointmentOutsideAvailability(
  appointmentTime: string, // HH:mm format
  dayOfWeek: number,
  availability: DentistAvailability[]
): boolean {
  const dayAvail = availability.find(a => a.day_of_week === dayOfWeek);

  // Day not found or not available
  if (!dayAvail || !dayAvail.is_available) {
    return true;
  }

  const isOvernight = isOvernightShift(dayAvail.start_time, dayAvail.end_time);

  // Check if outside working hours
  if (!isTimeInRange(appointmentTime, dayAvail.start_time, dayAvail.end_time, isOvernight)) {
    return true;
  }

  // Check if during break
  if (dayAvail.break_start_time && dayAvail.break_end_time) {
    if (
      compareTime(appointmentTime, dayAvail.break_start_time) >= 0 &&
      compareTime(appointmentTime, dayAvail.break_end_time) < 0
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Format time for display (24h to 12h with AM/PM)
 */
export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generate time slot options for dropdowns
 */
export function generateTimeSlotOptions(
  intervalMinutes: number = 30,
  startHour: number = 0,
  endHour: number = 24
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push({
        value,
        label: value,
      });
    }
  }

  return options;
}

/**
 * Default availability template for a new practitioner
 */
export function getDefaultAvailability(): DentistAvailability[] {
  return [
    { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true, break_start_time: '12:00', break_end_time: '13:00' },
    { day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true, break_start_time: '12:00', break_end_time: '13:00' },
    { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true, break_start_time: '12:00', break_end_time: '13:00' },
    { day_of_week: 4, start_time: '09:00', end_time: '17:00', is_available: true, break_start_time: '12:00', break_end_time: '13:00' },
    { day_of_week: 5, start_time: '09:00', end_time: '17:00', is_available: true, break_start_time: '12:00', break_end_time: '13:00' },
    { day_of_week: 6, start_time: '09:00', end_time: '13:00', is_available: false },
    { day_of_week: 0, start_time: '09:00', end_time: '13:00', is_available: false },
  ];
}
