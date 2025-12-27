/**
 * Appointment State Machine - Single source of truth for appointment states
 * 
 * All patient-visible behavior is derived from appointment state.
 * No screen, component, or feature may bypass it.
 */

// ============================================================================
// AUTHORITATIVE STATE DEFINITIONS
// ============================================================================

/**
 * The five canonical appointment states
 */
export type AppointmentState =
  | 'UPCOMING'              // Scheduled, not yet happened
  | 'COMPLETED_DRAFT'       // Occurred, dentist hasn't finalized
  | 'COMPLETED_FINAL_UNPAID'// Finalized, invoice issued, payment pending
  | 'COMPLETED_FINAL_PAID'  // Fully closed
  | 'CANCELLED';            // Did not take place

/**
 * Minimal appointment data required to derive state
 */
export interface AppointmentStateInput {
  status: string;
  payment_status: string | null;
  appointment_date: string;
  completed_at: string | null;
  /** Whether dentist has finalized the appointment (e.g., added notes, invoice) */
  is_finalized?: boolean;
  /** Amount due in cents (if any) */
  amount_due_cents?: number | null;
}

// ============================================================================
// STATE DERIVATION
// ============================================================================

/**
 * Derive the appointment state from raw appointment data
 * This is the ONLY function that should determine state
 */
export function deriveAppointmentState(input: AppointmentStateInput): AppointmentState {
  const { status, payment_status, appointment_date, completed_at, is_finalized, amount_due_cents } = input;

  // 1. Cancelled takes priority
  if (status === 'cancelled') {
    return 'CANCELLED';
  }

  // 2. If status is completed (or appointment is in the past and confirmed)
  const appointmentTime = new Date(appointment_date).getTime();
  const now = Date.now();
  const isPast = appointmentTime < now;
  const isCompletedStatus = status === 'completed';

  if (isCompletedStatus || (isPast && status !== 'cancelled')) {
    // Check if finalized (has consultation notes, completed_at, or explicit flag)
    const hasBeenFinalized = is_finalized === true || completed_at !== null;

    if (!hasBeenFinalized) {
      // Dentist hasn't finalized yet
      return 'COMPLETED_DRAFT';
    }

    // Finalized - check payment status
    const isPaid = payment_status === 'paid';
    const hasPendingPayment = payment_status === 'pending' || payment_status === 'unpaid';
    const hasAmountDue = (amount_due_cents ?? 0) > 0;

    if (isPaid) {
      return 'COMPLETED_FINAL_PAID';
    }

    if (hasPendingPayment || hasAmountDue) {
      return 'COMPLETED_FINAL_UNPAID';
    }

    // Finalized with no payment required (e.g., covered by insurance, free consultation)
    return 'COMPLETED_FINAL_PAID';
  }

  // 3. Future appointment
  return 'UPCOMING';
}

// ============================================================================
// STATE CONFIGURATION
// ============================================================================

export interface StateConfig {
  label: string;
  description: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClassName: string;
}

export const STATE_CONFIG: Record<AppointmentState, StateConfig> = {
  UPCOMING: {
    label: 'Upcoming',
    description: 'Appointment is scheduled',
    badgeVariant: 'outline',
    badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
  },
  COMPLETED_DRAFT: {
    label: 'Completed',
    description: 'Appointment completed, details pending',
    badgeVariant: 'outline',
    badgeClassName: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200',
  },
  COMPLETED_FINAL_UNPAID: {
    label: 'Action required',
    description: 'Payment pending',
    badgeVariant: 'outline',
    badgeClassName: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200',
  },
  COMPLETED_FINAL_PAID: {
    label: 'Completed',
    description: 'Fully closed',
    badgeVariant: 'outline',
    badgeClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Appointment did not take place',
    badgeVariant: 'outline',
    badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200',
  },
};

export function getStateConfig(state: AppointmentState): StateConfig {
  return STATE_CONFIG[state];
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

export interface StatePermissions {
  /** Patient can reschedule */
  canReschedule: boolean;
  /** Patient can cancel */
  canCancel: boolean;
  /** Patient can pay */
  canPay: boolean;
  /** Patient can download documents */
  canDownloadDocuments: boolean;
  /** Records are visible to patient */
  recordsVisible: boolean;
  /** Payment info is visible to patient */
  paymentsVisible: boolean;
  /** Treatment summary is visible */
  treatmentSummaryVisible: boolean;
}

/**
 * Get permissions for a given state
 */
export function getStatePermissions(state: AppointmentState): StatePermissions {
  switch (state) {
    case 'UPCOMING':
      return {
        canReschedule: true,
        canCancel: true,
        canPay: false,
        canDownloadDocuments: false,
        recordsVisible: false,
        paymentsVisible: false,
        treatmentSummaryVisible: false,
      };

    case 'COMPLETED_DRAFT':
      return {
        canReschedule: false,
        canCancel: false,
        canPay: false,
        canDownloadDocuments: false,
        recordsVisible: false,
        paymentsVisible: false,
        treatmentSummaryVisible: false,
      };

    case 'COMPLETED_FINAL_UNPAID':
      return {
        canReschedule: false,
        canCancel: false,
        canPay: true,
        canDownloadDocuments: true,
        recordsVisible: true,
        paymentsVisible: true,
        treatmentSummaryVisible: true,
      };

    case 'COMPLETED_FINAL_PAID':
      return {
        canReschedule: false,
        canCancel: false,
        canPay: false,
        canDownloadDocuments: true,
        recordsVisible: true,
        paymentsVisible: true,
        treatmentSummaryVisible: true,
      };

    case 'CANCELLED':
      return {
        canReschedule: false, // Must book new appointment
        canCancel: false,
        canPay: false,
        canDownloadDocuments: false,
        recordsVisible: false,
        paymentsVisible: false,
        treatmentSummaryVisible: false,
      };
  }
}

// ============================================================================
// GROUPING HELPERS (for list views)
// ============================================================================

export type AppointmentGroup = 'upcoming' | 'completed' | 'cancelled';

/**
 * Get the display group for an appointment state
 * Used for grouping in list views
 */
export function getAppointmentGroup(state: AppointmentState): AppointmentGroup {
  switch (state) {
    case 'UPCOMING':
      return 'upcoming';
    case 'COMPLETED_DRAFT':
    case 'COMPLETED_FINAL_UNPAID':
    case 'COMPLETED_FINAL_PAID':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
  }
}

/**
 * Check if an appointment should appear in Records screen
 */
export function isVisibleInRecords(state: AppointmentState): boolean {
  return state === 'COMPLETED_FINAL_UNPAID' || state === 'COMPLETED_FINAL_PAID';
}

/**
 * Check if an appointment should appear in Payments screen
 */
export function isVisibleInPayments(state: AppointmentState): boolean {
  return state === 'COMPLETED_FINAL_UNPAID' || state === 'COMPLETED_FINAL_PAID';
}

// ============================================================================
// TRANSITION VALIDATION (informational - actual transitions happen in backend)
// ============================================================================

export type StateTransition =
  | { from: 'UPCOMING'; to: 'COMPLETED_DRAFT'; trigger: 'dentist_completes' }
  | { from: 'UPCOMING'; to: 'CANCELLED'; trigger: 'patient_cancels' }
  | { from: 'COMPLETED_DRAFT'; to: 'COMPLETED_FINAL_UNPAID'; trigger: 'dentist_finalizes_with_payment' }
  | { from: 'COMPLETED_DRAFT'; to: 'COMPLETED_FINAL_PAID'; trigger: 'dentist_finalizes_no_payment' }
  | { from: 'COMPLETED_FINAL_UNPAID'; to: 'COMPLETED_FINAL_PAID'; trigger: 'payment_received' };

/**
 * Valid transitions from each state
 */
export const VALID_TRANSITIONS: Record<AppointmentState, AppointmentState[]> = {
  UPCOMING: ['COMPLETED_DRAFT', 'CANCELLED'],
  COMPLETED_DRAFT: ['COMPLETED_FINAL_UNPAID', 'COMPLETED_FINAL_PAID'],
  COMPLETED_FINAL_UNPAID: ['COMPLETED_FINAL_PAID'],
  COMPLETED_FINAL_PAID: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: AppointmentState, to: AppointmentState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
