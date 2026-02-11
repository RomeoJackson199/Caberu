/**
 * Dentist Appointment State Machine
 * 
 * Defines states, permissions, and behavior for the dentist-facing
 * appointment detail screen. This is the SINGLE SOURCE OF TRUTH
 * for what dentists can do with appointments.
 */

// ============================================================================
// STATE DEFINITIONS
// ============================================================================

/**
 * The three canonical dentist-facing appointment states
 */
export type DentistAppointmentState =
  | 'UPCOMING'          // Future appointment - view only
  | 'COMPLETED_DRAFT'   // Past/in-progress - editable consultation workspace
  | 'FINALIZED';        // Locked - read-only summary

/**
 * Derive dentist appointment state from raw appointment data
 */
export function deriveDentistState(appointment: {
  status: string;
  appointment_date: string;
  completed_at: string | null;
}): DentistAppointmentState {
  const { status, appointment_date, completed_at } = appointment;
  
  // Cancelled appointments are treated as finalized (no edits)
  if (status === 'cancelled') {
    return 'FINALIZED';
  }
  
  // Check if finalized (has completed_at timestamp)
  if (completed_at) {
    return 'FINALIZED';
  }
  
  // Check if appointment is in the past or marked completed
  const appointmentTime = new Date(appointment_date).getTime();
  const now = Date.now();
  const isPast = appointmentTime < now;
  const isCompleted = status === 'completed';
  
  if (isPast || isCompleted) {
    return 'COMPLETED_DRAFT';
  }
  
  return 'UPCOMING';
}

// ============================================================================
// STATE CONFIGURATION
// ============================================================================

export interface DentistStateConfig {
  label: string;
  description: string;
  badgeClassName: string;
  icon: 'calendar' | 'edit' | 'check' | 'x';
}

export const DENTIST_STATE_CONFIG: Record<DentistAppointmentState, DentistStateConfig> = {
  UPCOMING: {
    label: 'Upcoming',
    description: 'Scheduled appointment',
    badgeClassName: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    icon: 'calendar',
  },
  COMPLETED_DRAFT: {
    label: 'In Consultation',
    description: 'Add notes, documents, and charges',
    badgeClassName: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
    icon: 'edit',
  },
  FINALIZED: {
    label: 'Finalized',
    description: 'Appointment completed and locked',
    badgeClassName: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
    icon: 'check',
  },
};

// ============================================================================
// DENTIST PERMISSIONS
// ============================================================================

export interface DentistStatePermissions {
  /** Can edit clinical notes */
  canEditNotes: boolean;
  /** Can upload/manage documents */
  canManageDocuments: boolean;
  /** Can add/edit charges */
  canEditCharges: boolean;
  /** Can schedule follow-up */
  canScheduleFollowUp: boolean;
  /** Can finalize appointment */
  canFinalize: boolean;
  /** Can cancel appointment */
  canCancel: boolean;
  /** Can reschedule appointment */
  canReschedule: boolean;
  /** Show consultation workspace */
  showWorkspace: boolean;
}

export function getDentistPermissions(state: DentistAppointmentState): DentistStatePermissions {
  switch (state) {
    case 'UPCOMING':
      return {
        canEditNotes: true,
        canManageDocuments: true,
        canEditCharges: false,
        canScheduleFollowUp: false,
        canFinalize: false,
        canCancel: true,
        canReschedule: true,
        showWorkspace: true,
      };
    
    case 'COMPLETED_DRAFT':
      return {
        canEditNotes: true,
        canManageDocuments: true,
        canEditCharges: true,
        canScheduleFollowUp: true,
        canFinalize: true,
        canCancel: false,
        canReschedule: false,
        showWorkspace: true,
      };
    
    case 'FINALIZED':
      return {
        canEditNotes: false,
        canManageDocuments: false,
        canEditCharges: false,
        canScheduleFollowUp: false,
        canFinalize: false,
        canCancel: false,
        canReschedule: false,
        showWorkspace: true, // Show read-only
      };
  }
}
