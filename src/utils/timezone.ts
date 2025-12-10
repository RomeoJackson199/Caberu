/**
 * Timezone Utility for Appointments
 * Handles Brussels timezone conversions and DST transitions
 */

const CLINIC_TIMEZONE = 'Europe/Brussels';

/**
 * Convert UTC date to Brussels clinic time
 * @param utcDate - Date in UTC
 * @returns Date adjusted to Brussels timezone
 */
export const convertToClinicTime = (utcDate: Date | string): Date => {
    const date = new Date(utcDate);

    // Get the Brussels timezone offset for this specific date
    const brusselsDateStr = date.toLocaleString('en-US', {
        timeZone: CLINIC_TIMEZONE
    });

    return new Date(brusselsDateStr);
};

/**
 * Convert Brussels local time to UTC
 * @param clinicDate - Date in Brussels timezone
 * @returns Date in UTC
 */
export const convertToUTC = (clinicDate: Date): Date => {
    // Get the offset for Brussels at this date
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: CLINIC_TIMEZONE,
        timeZoneName: 'longOffset'
    });

    const parts = formatter.formatToParts(clinicDate);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');

    // Parse offset like "GMT+01:00" or "GMT+02:00"
    const offsetMatch = offsetPart?.value.match(/GMT([+-])(\d{2}):(\d{2})/);

    if (offsetMatch) {
        const sign = offsetMatch[1] === '+' ? -1 : 1;
        const hours = parseInt(offsetMatch[2], 10);
        const minutes = parseInt(offsetMatch[3], 10);
        const offsetMs = sign * (hours * 60 + minutes) * 60 * 1000;

        return new Date(clinicDate.getTime() + offsetMs);
    }

    return clinicDate;
};

/**
 * Format UTC date as Brussels local time string
 * @param utcDate - Date in UTC
 * @param formatStr - Format options
 * @returns Formatted string in Brussels time
 */
export const formatClinicTime = (
    utcDate: Date | string,
    options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string => {
    const date = new Date(utcDate);

    return date.toLocaleString('en-GB', {
        timeZone: CLINIC_TIMEZONE,
        ...options
    });
};

/**
 * Create appointment datetime from separate date and time strings
 * Handles timezone correctly for Brussels
 * @param dateStr - Date string like "2025-12-10"
 * @param timeStr - Time string like "09:00"
 * @returns UTC Date object
 */
export const createAppointmentDateTime = (dateStr: string, timeStr: string): Date => {
    // Create datetime string as if it's in Brussels
    const datetimeString = `${dateStr}T${timeStr}:00`;

    // Parse as Brussels time and get UTC equivalent
    const brusselsDate = new Date(datetimeString);

    // Get the UTC timestamp for this Brussels time
    // We need to determine the offset for this specific date (handles DST)
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: CLINIC_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Create a date object that represents the Brussels time
    // Then calculate what UTC time that corresponds to
    const testDate = new Date(`${dateStr}T12:00:00Z`);
    const brusselsParts = formatter.formatToParts(testDate);

    // Get offset by comparing UTC noon to Brussels noon
    const utcNoon = new Date(`${dateStr}T12:00:00Z`);
    const brusselsNoonStr = utcNoon.toLocaleString('en-US', { timeZone: CLINIC_TIMEZONE });
    const brusselsNoon = new Date(brusselsNoonStr);

    const offsetMs = brusselsNoon.getTime() - utcNoon.getTime();

    // Now apply this offset to our target time
    const targetBrussels = new Date(`${dateStr}T${timeStr}:00`);
    const targetUTC = new Date(targetBrussels.getTime() - offsetMs);

    return targetUTC;
};

/**
 * Extract time string (HH:MM) from UTC date in Brussels timezone
 * @param utcDate - UTC date
 * @returns Time string like "09:00"
 */
export const extractClinicTimeString = (utcDate: Date | string): string => {
    const date = new Date(utcDate);

    return date.toLocaleString('en-GB', {
        timeZone: CLINIC_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

/**
 * Extract date string (YYYY-MM-DD) from UTC date in Brussels timezone
 * @param utcDate - UTC date
 * @returns Date string like "2025-12-10"
 */
export const extractClinicDateString = (utcDate: Date | string): string => {
    const date = new Date(utcDate);

    const parts = date.toLocaleString('en-GB', {
        timeZone: CLINIC_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('/');

    // en-GB gives DD/MM/YYYY, we need YYYY-MM-DD
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

/**
 * Check if two dates are the same day in Brussels timezone
 */
export const isSameClinicDay = (date1: Date | string, date2: Date | string): boolean => {
    return extractClinicDateString(date1) === extractClinicDateString(date2);
};

/**
 * Get current Brussels time
 */
export const getCurrentClinicTime = (): Date => {
    return convertToClinicTime(new Date());
};

export default {
    convertToClinicTime,
    convertToUTC,
    formatClinicTime,
    createAppointmentDateTime,
    extractClinicTimeString,
    extractClinicDateString,
    isSameClinicDay,
    getCurrentClinicTime,
    CLINIC_TIMEZONE
};
