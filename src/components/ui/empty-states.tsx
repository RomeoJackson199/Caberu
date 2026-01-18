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
 * Generic empty state component
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
 * Empty state for appointment lists
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
 * Empty state for patient lists
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
 * Empty state for search results
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
 * Generic no data state
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
 * Empty state for prescriptions
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
 * Empty state for treatment plans
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
 * Empty state for error scenarios
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
 * Compact empty state for inline usage (no card wrapper)
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
