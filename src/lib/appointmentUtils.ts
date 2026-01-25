// Centralized appointment status and urgency management
import { utcToClinicTime, formatClinicTime } from './timezone';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high';

export interface AppointmentStatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  canComplete: boolean;
  canCancel: boolean;
  canReschedule: boolean;
}

export interface UrgencyConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  priority: number;
}

// Appointment status configuration using semantic design tokens
export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, AppointmentStatusConfig> = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-warning-100',
    textColor: 'text-warning-800',
    borderColor: 'border-warning-300',
    canComplete: true,
    canCancel: true,
    canReschedule: true
  },
  confirmed: {
    label: 'Confirmed',
    bgColor: 'bg-success-100',
    textColor: 'text-success-800',
    borderColor: 'border-success-300',
    canComplete: true,
    canCancel: true,
    canReschedule: true
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-info-100',
    textColor: 'text-info-800',
    borderColor: 'border-info-300',
    canComplete: false,
    canCancel: false,
    canReschedule: false
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-danger-100',
    textColor: 'text-danger-800',
    borderColor: 'border-danger-300',
    canComplete: false,
    canCancel: false,
    canReschedule: true
  }
};

// Urgency level configuration using semantic design tokens
export const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
  low: {
    label: 'Low Priority',
    bgColor: 'bg-success-100',
    textColor: 'text-success-800',
    borderColor: 'border-success-300',
    priority: 1
  },
  medium: {
    label: 'Medium Priority',
    bgColor: 'bg-warning-100',
    textColor: 'text-warning-800',
    borderColor: 'border-warning-300',
    priority: 2
  },
  high: {
    label: 'High Priority',
    bgColor: 'bg-danger-100',
    textColor: 'text-danger-800',
    borderColor: 'border-danger-300',
    priority: 3
  }
};

/**
 * Get status configuration for an appointment
 */
export function getStatusConfig(status: string): AppointmentStatusConfig {
  return APPOINTMENT_STATUS_CONFIG[status as AppointmentStatus] || APPOINTMENT_STATUS_CONFIG.pending;
}

/**
 * Get urgency configuration for an appointment
 */
export function getUrgencyConfig(urgency: string): UrgencyConfig {
  return URGENCY_CONFIG[urgency as UrgencyLevel] || URGENCY_CONFIG.medium;
}

/**
 * Get combined CSS classes for status badge
 */
export function getStatusClasses(status: string): string {
  const config = getStatusConfig(status);
  return `${config.bgColor} ${config.textColor} ${config.borderColor}`;
}

/**
 * Get combined CSS classes for urgency badge
 */
export function getUrgencyClasses(urgency: string): string {
  const config = getUrgencyConfig(urgency);
  return `${config.bgColor} ${config.textColor} ${config.borderColor}`;
}

/**
 * Check if appointment can be completed
 */
export function canCompleteAppointment(status: string): boolean {
  return getStatusConfig(status).canComplete;
}

/**
 * Check if appointment can be cancelled
 */
export function canCancelAppointment(status: string): boolean {
  return getStatusConfig(status).canCancel;
}

/**
 * Check if appointment can be rescheduled
 */
export function canRescheduleAppointment(status: string): boolean {
  return getStatusConfig(status).canReschedule;
}

/**
 * Format appointment date with timezone handling
 */
export function formatAppointmentDate(appointmentDate: string, format = 'MMM dd, yyyy HH:mm'): string {
  return formatClinicTime(appointmentDate, format);
}

/**
 * Get appointment date as clinic timezone Date object
 */
export function getAppointmentDate(appointmentDate: string): Date {
  return utcToClinicTime(appointmentDate);
}

/**
 * Check if appointment is today
 */
export function isAppointmentToday(appointmentDate: string): boolean {
  const appointmentDay = getAppointmentDate(appointmentDate);
  const today = utcToClinicTime(new Date().toISOString());
  
  return appointmentDay.toDateString() === today.toDateString();
}

/**
 * Check if appointment is upcoming (future)
 */
export function isAppointmentUpcoming(appointmentDate: string): boolean {
  const appointmentTime = getAppointmentDate(appointmentDate);
  const now = utcToClinicTime(new Date().toISOString());
  
  return appointmentTime > now;
}

/**
 * Get appointment time remaining in minutes
 */
export function getTimeUntilAppointment(appointmentDate: string): number {
  const appointmentTime = getAppointmentDate(appointmentDate);
  const now = utcToClinicTime(new Date().toISOString());
  
  return Math.floor((appointmentTime.getTime() - now.getTime()) / (1000 * 60));
}

/**
 * Sort appointments by priority (urgency + date)
 */
export function sortAppointmentsByPriority(appointments: any[]): any[] {
  return appointments.sort((a, b) => {
    const urgencyA = getUrgencyConfig(a.urgency).priority;
    const urgencyB = getUrgencyConfig(b.urgency).priority;
    
    // Sort by urgency first (higher priority first)
    if (urgencyA !== urgencyB) {
      return urgencyB - urgencyA;
    }
    
    // Then by date (earlier appointments first)
    const dateA = new Date(a.appointment_date).getTime();
    const dateB = new Date(b.appointment_date).getTime();
    return dateA - dateB;
  });
}

/**
 * Validate appointment status
 */
export function isValidAppointmentStatus(status: string): status is AppointmentStatus {
  return Object.keys(APPOINTMENT_STATUS_CONFIG).includes(status);
}

/**
 * Validate urgency level
 */
export function isValidUrgencyLevel(urgency: string): urgency is UrgencyLevel {
  return Object.keys(URGENCY_CONFIG).includes(urgency);
}

// ============================================
// Overlapping Appointments Handling
// ============================================

// Import and re-export CalendarEvent from central types for backwards compatibility
import type { CalendarEvent } from "@/types/appointment";
export type { CalendarEvent } from "@/types/appointment";

export interface PositionedEvent {
  id: string;
  appointment_date: string;
  duration_minutes?: number;
  status: CalendarEvent['status'];
  column: number;
  totalColumns: number;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  reason?: string;
  patient?: any;
  patient_id?: string;
  isGoogleCalendarEvent?: boolean;
  [key: string]: any;
}

/**
 * Check if two events overlap in time
 */
function eventsOverlap(event1: { appointment_date: string; duration_minutes?: number }, event2: { appointment_date: string; duration_minutes?: number }): boolean {
  const start1 = new Date(event1.appointment_date).getTime();
  const end1 = start1 + ((event1.duration_minutes || 30) * 60 * 1000);
  const start2 = new Date(event2.appointment_date).getTime();
  const end2 = start2 + ((event2.duration_minutes || 30) * 60 * 1000);

  // Events overlap if one starts before the other ends
  return start1 < end2 && start2 < end1;
}

/**
 * Group overlapping events together
 */
function groupOverlappingEvents(events: CalendarEvent[]): CalendarEvent[][] {
  if (events.length === 0) return [];

  // Sort events by start time
  const sorted = [...events].sort((a, b) =>
    new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
  );

  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i];
    // Check if this event overlaps with any event in the current group
    const overlapsWithGroup = currentGroup.some(groupEvent => eventsOverlap(event, groupEvent));

    if (overlapsWithGroup) {
      currentGroup.push(event);
    } else {
      groups.push(currentGroup);
      currentGroup = [event];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Assign columns to events within a group using a greedy algorithm
 */
function assignColumns(group: CalendarEvent[]): PositionedEvent[] {
  if (group.length === 0) return [];
  if (group.length === 1) {
    return [{ ...group[0], column: 0, totalColumns: 1 }];
  }

  // Sort by start time
  const sorted = [...group].sort((a, b) =>
    new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
  );

  // Track column end times
  const columnEndTimes: number[] = [];
  const result: PositionedEvent[] = [];

  for (const event of sorted) {
    const startTime = new Date(event.appointment_date).getTime();
    const endTime = startTime + ((event.duration_minutes || 30) * 60 * 1000);

    // Find first available column
    let column = -1;
    for (let i = 0; i < columnEndTimes.length; i++) {
      if (columnEndTimes[i] <= startTime) {
        column = i;
        columnEndTimes[i] = endTime;
        break;
      }
    }

    // If no column available, create a new one
    if (column === -1) {
      column = columnEndTimes.length;
      columnEndTimes.push(endTime);
    }

    result.push({
      ...event,
      column,
      totalColumns: 1 // Will be updated after
    });
  }

  // Update total columns for all events in this group
  const totalColumns = columnEndTimes.length;
  return result.map(event => ({ ...event, totalColumns }));
}

/**
 * Process events to calculate their column positions for rendering
 * Returns events with column and totalColumns properties
 */
export function calculateEventPositions(events: CalendarEvent[]): PositionedEvent[] {
  const groups = groupOverlappingEvents(events);
  const positionedEvents: PositionedEvent[] = [];

  for (const group of groups) {
    const positioned = assignColumns(group);
    positionedEvents.push(...positioned);
  }

  return positionedEvents;
}

/**
 * Get style object for a positioned event (for use in calendar views)
 */
export function getOverlappingEventStyle(
  event: PositionedEvent,
  startHour: number,
  hourHeight: number,
  minHeight: number = 20,
  horizontalPadding: number = 2
): React.CSSProperties {
  const startDate = new Date(event.appointment_date);
  const startDecimalHour = startDate.getHours() + (startDate.getMinutes() / 60);
  const durationHours = (event.duration_minutes || 30) / 60;

  const top = (startDecimalHour - startHour) * hourHeight;
  const height = durationHours * hourHeight;

  // Calculate width and left position based on column
  const totalColumns = event.totalColumns;
  const column = event.column;
  const availableWidth = 100 - (horizontalPadding * 2);
  const columnWidth = availableWidth / totalColumns;

  return {
    position: 'absolute',
    top: `${Math.max(0, top)}px`,
    height: `${Math.max(minHeight, height)}px`,
    left: `${horizontalPadding + (column * columnWidth)}%`,
    width: `${columnWidth - 1}%`, // -1% for gap between columns
    zIndex: 10 + column, // Stagger z-index so later columns appear on top
  };
}