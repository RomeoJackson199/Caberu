// Error State Components
export { ErrorState, EmptyState } from "./ErrorState";
export type { ErrorType } from "./ErrorState";

// Network Status Components
export { NetworkStatus, NetworkIndicator, SyncingIndicator } from "./NetworkStatus";

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

// Loading States (re-export from SkeletonLoader for convenience)
export {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  ListSkeleton,
  FormSkeleton,
  ProfileSkeleton,
  DashboardStatsSkeleton,
  CalendarSkeleton,
  ChartSkeleton,
  AppointmentCardSkeleton,
  PatientCardSkeleton,
  TextSkeleton,
} from "../SkeletonLoader";
