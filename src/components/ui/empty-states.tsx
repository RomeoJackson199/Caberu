/**
 * Standardized Empty State Components
 * Provides consistent empty states across the application
 *
 * Usage:
 * - EmptyState: Generic empty state with customizable content
 * - NoAppointments: Empty state for appointment lists
 * - NoPatients: Empty state for patient lists
 * - NoResults: Empty state for search results
 * - NoData: Generic no data state
 */

import { Button } from './button';
import { Card, CardContent } from './card';
import {
  Calendar,
  User,
  Search,
  FileText,
  AlertCircle,
  Inbox,
  Plus,
  RefreshCw,
  LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

/**
 * Render a centered card-style empty state with an icon, title, optional description, and optional primary/secondary actions.
 *
 * @param icon - Optional icon component to show above the title; defaults to an Inbox icon when omitted.
 * @param title - Heading text displayed below the icon.
 * @param description - Optional supporting text shown under the title.
 * @param action - Optional primary action object. When provided, renders a primary Button showing `label`, calling `onClick`, and optionally showing `icon`.
 * @param secondaryAction - Optional secondary action object. When provided, renders an outline Button showing `label`, calling `onClick`, and optionally showing `icon`.
 * @returns The JSX element for a centered empty-state Card containing the icon, title, optional description, and optional action buttons.
 */
export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  const IconComponent = Icon || Inbox;

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <IconComponent className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mb-6 text-sm text-muted-foreground max-w-md">{description}</p>
        )}
        {(action || secondaryAction) && (
          <div className="flex gap-2">
            {action && (
              <Button onClick={action.onClick} className="gap-2">
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline" className="gap-2">
                {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Render an empty-state UI for appointment lists.
 *
 * When `showCreateButton` is true and `onCreateAppointment` is provided, the component includes a primary
 * action labeled "Create Appointment" that invokes `onCreateAppointment` when clicked.
 *
 * @param onCreateAppointment - Optional callback invoked when the primary action is clicked.
 * @param showCreateButton - Whether to show the primary "Create Appointment" button (default: true).
 * @returns The configured EmptyState element for appointments.
 */
export function NoAppointments({
  onCreateAppointment,
  showCreateButton = true,
}: {
  onCreateAppointment?: () => void;
  showCreateButton?: boolean;
}) {
  return (
    <EmptyState
      icon={Calendar}
      title="No appointments yet"
      description="Get started by scheduling your first appointment. You can create, manage, and track all your appointments from here."
      action={
        showCreateButton && onCreateAppointment
          ? {
              label: 'Create Appointment',
              onClick: onCreateAppointment,
              icon: Plus,
            }
          : undefined
      }
    />
  );
}

/**
 * Render an empty state for patient lists that prompts the user to add patients.
 *
 * Renders a standardized empty-state card with a patient icon, a title, and a descriptive message.
 * If `showAddButton` is true and `onAddPatient` is provided, a primary "Add Patient" action is shown and invokes `onAddPatient` when clicked.
 *
 * @param onAddPatient - Optional callback invoked when the primary "Add Patient" action is activated.
 * @param showAddButton - Whether to display the primary "Add Patient" action; defaults to `true`.
 * @returns The EmptyState component configured for patient lists.
 */
export function NoPatients({
  onAddPatient,
  showAddButton = true,
}: {
  onAddPatient?: () => void;
  showAddButton?: boolean;
}) {
  return (
    <EmptyState
      icon={User}
      title="No patients found"
      description="Start building your patient base by adding your first patient. You can manage patient records, appointments, and medical history from here."
      action={
        showAddButton && onAddPatient
          ? {
              label: 'Add Patient',
              onClick: onAddPatient,
              icon: Plus,
            }
          : undefined
      }
    />
  );
}

/**
 * Displays a standardized empty state for search results.
 *
 * The displayed title will include the `searchTerm` when provided. If `onClearSearch` is supplied, a primary "Clear Search" action is shown; if `onRetry` is supplied, a secondary "Try Again" action is shown.
 *
 * @param searchTerm - Optional search term to include in the title (e.g., `No results for "term"`).
 * @param onClearSearch - Optional callback invoked by the primary "Clear Search" action.
 * @param onRetry - Optional callback invoked by the secondary "Try Again" action.
 * @returns A JSX element rendering the configured empty state for search results.
 */
export function NoResults({
  searchTerm,
  onClearSearch,
  onRetry,
}: {
  searchTerm?: string;
  onClearSearch?: () => void;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title={searchTerm ? `No results for "${searchTerm}"` : 'No results found'}
      description="Try adjusting your search terms or filters to find what you're looking for."
      action={
        onClearSearch
          ? {
              label: 'Clear Search',
              onClick: onClearSearch,
              icon: RefreshCw,
            }
          : undefined
      }
      secondaryAction={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

/**
 * Render a standardized "no data" empty state with an optional refresh action.
 *
 * @param title - Title text displayed in the empty state. Defaults to "No data available".
 * @param description - Supporting description text displayed below the title. Defaults to "There is no data to display at the moment."
 * @param onRefresh - Optional callback; when provided a primary "Refresh" action is rendered that invokes this callback when clicked.
 * @returns The empty-state JSX element configured with the provided title, description, and optional refresh action.
 */
export function NoData({
  title = 'No data available',
  description = 'There is no data to display at the moment.',
  onRefresh,
}: {
  title?: string;
  description?: string;
  onRefresh?: () => void;
}) {
  return (
    <EmptyState
      icon={FileText}
      title={title}
      description={description}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
              icon: RefreshCw,
            }
          : undefined
      }
    />
  );
}

/**
 * Render an empty-state card for prescriptions.
 *
 * Displays a standardized empty state with a title and description, and an optional
 * primary action to create a prescription.
 *
 * @param onCreatePrescription - Callback invoked when the "Create Prescription" action is clicked.
 * @param showCreateButton - Whether to show the primary "Create Prescription" button. Defaults to `true`.
 * @returns A JSX element representing the prescriptions empty state.
 */
export function NoPrescriptions({
  onCreatePrescription,
  showCreateButton = true,
}: {
  onCreatePrescription?: () => void;
  showCreateButton?: boolean;
}) {
  return (
    <EmptyState
      icon={FileText}
      title="No prescriptions"
      description="No prescriptions have been created yet. Start by adding a prescription for your patient."
      action={
        showCreateButton && onCreatePrescription
          ? {
              label: 'Create Prescription',
              onClick: onCreatePrescription,
              icon: Plus,
            }
          : undefined
      }
    />
  );
}

/**
 * Render an empty-state UI for treatment plans.
 *
 * @param onCreatePlan - Optional callback invoked when the "Create Treatment Plan" action is triggered.
 * @param showCreateButton - When `true` and `onCreatePlan` is provided, show the primary "Create Treatment Plan" button.
 * @returns A JSX element representing the treatment-plans empty state configured with title, description, icon, and optional primary action.
 */
export function NoTreatmentPlans({
  onCreatePlan,
  showCreateButton = true,
}: {
  onCreatePlan?: () => void;
  showCreateButton?: boolean;
}) {
  return (
    <EmptyState
      icon={FileText}
      title="No treatment plans"
      description="Create a comprehensive treatment plan to guide patient care and track progress."
      action={
        showCreateButton && onCreatePlan
          ? {
              label: 'Create Treatment Plan',
              onClick: onCreatePlan,
              icon: Plus,
            }
          : undefined
      }
    />
  );
}

/**
 * Renders a standardized empty-state for error conditions with an optional retry action.
 *
 * Shows an alert icon, a title, and a description. If `onRetry` is provided, includes a primary
 * action button labeled "Try Again" that invokes the callback.
 *
 * @param title - Heading shown in the empty state (defaults to "Something went wrong")
 * @param description - Supporting message shown below the title
 * @param onRetry - Optional callback invoked when the "Try Again" action is clicked
 * @returns A JSX element representing the error empty state
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this data. Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
              icon: RefreshCw,
            }
          : undefined
      }
    />
  );
}

/**
 * Renders a compact inline empty state with an icon, title, and optional description.
 *
 * @param icon - Optional icon component to display; defaults to `Inbox` when omitted.
 * @param title - Title text to display.
 * @param description - Optional descriptive text shown below the title.
 * @returns A JSX element containing the compact empty state layout (no card wrapper).
 */
export function CompactEmptyState({ icon: Icon, title, description }: Omit<EmptyStateProps, 'action' | 'secondaryAction'>) {
  const IconComponent = Icon || Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
      <div className="mb-3 rounded-full bg-muted/50 p-3">
        <IconComponent className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      )}
    </div>
  );
}