/**
 * Appointment Booking System Configuration
 *
 * This file contains configurable values for the appointment booking system.
 * These values can be overridden via environment variables or business settings.
 */

// ============================================
// Time & Scheduling Configuration
// ============================================

/** Default slot duration in minutes */
export const DEFAULT_SLOT_DURATION_MINUTES = 30;

/** Default working hours when no availability is set */
export const DEFAULT_WORKING_HOURS = {
  start: '09:00',
  end: '17:00',
};

/** Default lunch break when no availability is set */
export const DEFAULT_LUNCH_BREAK = {
  start: '12:00',
  end: '13:00',
};

/** Calendar display hours */
export const CALENDAR_DISPLAY = {
  startHour: 7,  // Calendar starts at 7 AM
  endHour: 20,   // Calendar ends at 8 PM
  hourHeight: 80, // Height of one hour in pixels
};

/** Default available days (Monday=1 to Friday=5) */
export const DEFAULT_AVAILABLE_DAYS = [1, 2, 3, 4, 5];

// ============================================
// Timezone Configuration
// ============================================

/** Default timezone for Belgian practices */
export const CLINIC_TIMEZONE = 'Europe/Brussels';

// ============================================
// Caching Configuration
// ============================================

/** Cache TTL for availability data in milliseconds (5 minutes) */
export const AVAILABILITY_CACHE_TTL = 5 * 60 * 1000;

/** Maximum number of cached availability entries */
export const AVAILABILITY_CACHE_MAX_SIZE = 100;

// ============================================
// UI Configuration
// ============================================

/** Number of columns for time slot grid on different screen sizes */
export const TIME_SLOT_GRID_COLUMNS = {
  mobile: 3,      // < 640px
  tablet: 4,      // 640px - 768px
  desktop: 5,     // >= 768px
};

/** Minimum height for appointment blocks in pixels */
export const MIN_APPOINTMENT_BLOCK_HEIGHT = 20;

// ============================================
// Retry Configuration
// ============================================

/** Maximum retry attempts for booking operations */
export const MAX_BOOKING_RETRIES = 3;

/** Base delay between retries in milliseconds */
export const RETRY_BASE_DELAY_MS = 1000;

/** Multiplier for exponential backoff */
export const RETRY_BACKOFF_MULTIPLIER = 2;

// ============================================
// Validation Configuration
// ============================================

/** Maximum characters for symptom description */
export const MAX_SYMPTOM_LENGTH = 500;

/** Maximum days in advance a booking can be made */
export const MAX_BOOKING_ADVANCE_DAYS = 90;

/** Minimum hours notice required for booking */
export const MIN_BOOKING_NOTICE_HOURS = 2;

// ============================================
// Appointment Status Colors
// ============================================

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border-l-4 border-l-emerald-500',
  cancelled: 'bg-gray-100/80 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 border-l-4 border-l-gray-400 opacity-70',
  confirmed: 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border-l-4 border-l-blue-500',
  pending: 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-l-4 border-l-amber-500',
  'google-calendar': 'bg-purple-100/80 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 border-l-4 border-l-purple-500',
};

// ============================================
// Block/Schedule Indicator Styles
// ============================================

export const SCHEDULE_BLOCK_STYLES: Record<string, { bg: string; pattern: string; label: string; icon: string }> = {
  break: {
    bg: 'bg-orange-100/60 dark:bg-orange-900/30',
    pattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(251,146,60,0.3)_5px,rgba(251,146,60,0.3)_10px)]',
    label: 'Break',
    icon: '☕',
  },
  'sick-leave': {
    bg: 'bg-red-100/60 dark:bg-red-900/30',
    pattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(239,68,68,0.3)_5px,rgba(239,68,68,0.3)_10px)]',
    label: 'Sick Leave',
    icon: '🏥',
  },
  unavailable: {
    bg: 'bg-gray-200/60 dark:bg-gray-800/60',
    pattern: 'bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(156,163,175,0.2)_2px,rgba(156,163,175,0.2)_4px)]',
    label: 'Unavailable',
    icon: '🚫',
  },
  vacation: {
    bg: 'bg-teal-100/60 dark:bg-teal-900/30',
    pattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(20,184,166,0.3)_5px,rgba(20,184,166,0.3)_10px)]',
    label: 'Vacation',
    icon: '🌴',
  },
  holiday: {
    bg: 'bg-red-100/60 dark:bg-red-900/30',
    pattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(239,68,68,0.2)_5px,rgba(239,68,68,0.2)_10px)]',
    label: 'Public Holiday',
    icon: '🎌',
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get configuration value from environment or use default
 */
export function getConfigValue<T>(key: string, defaultValue: T): T {
  // In the future, this could read from environment variables or business settings
  // For now, just return the default
  return defaultValue;
}

/**
 * Check if a time string is within working hours
 */
export function isWithinWorkingHours(time: string, startTime = DEFAULT_WORKING_HOURS.start, endTime = DEFAULT_WORKING_HOURS.end): boolean {
  return time >= startTime && time < endTime;
}

/**
 * Check if a time string is within lunch break
 */
export function isDuringLunchBreak(time: string, breakStart = DEFAULT_LUNCH_BREAK.start, breakEnd = DEFAULT_LUNCH_BREAK.end): boolean {
  return time >= breakStart && time < breakEnd;
}
