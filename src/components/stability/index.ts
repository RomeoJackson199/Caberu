// Error State Components
export { ErrorState, EmptyState } from "./ErrorState";
export type { ErrorType } from "./ErrorState";

// Error Boundaries
export { AppointmentErrorBoundary, withAppointmentErrorBoundary } from "./AppointmentErrorBoundary";
export { FormErrorBoundary, withFormErrorBoundary } from "./FormErrorBoundary";

// Network Status Components
export { NetworkStatus, NetworkIndicator, SyncingIndicator } from "./NetworkStatus";
export { OfflineIndicator, OfflineBanner } from "./OfflineIndicator";

// Confirmation Dialogs
export {
  ConfirmationProvider,
  useConfirmation,
  ConfirmButton
} from "./ConfirmationDialogs";
export type { ConfirmationType } from "./ConfirmationDialogs";

// Success Dialogs
export {
  SuccessDialog,
  AppointmentSuccessDialog,
  PaymentSuccessDialog,
  TreatmentCompleteDialog
} from "./SuccessDialog";

// Session Management
export { SessionTimeoutWarning } from "./SessionTimeoutWarning";

// Calendar Sync
export { CalendarSyncStatus, CalendarSyncStatusCompact } from "./CalendarSyncStatus";

// Loading States (re-export skeleton components for convenience)
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonImage,
  SkeletonList,
  SkeletonTable,
  SkeletonStats,
} from "../ui/skeleton";
