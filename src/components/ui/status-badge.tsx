import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle, Clock, Circle } from 'lucide-react';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-all',
  {
    variants: {
      status: {
        // Appointment statuses
        scheduled: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30',
        confirmed: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/30',
        completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
        cancelled: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
        'no-show': 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/30',
        pending: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',

        // Payment statuses
        paid: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/30',
        unpaid: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
        'partially-paid': 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
        refunded: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/30',

        // General statuses
        active: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/30',
        inactive: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/30',
        draft: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/30',
        archived: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/30',

        // Alert levels
        success: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/30',
        warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
        error: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
        info: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30',

        // Priority levels
        critical: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
        high: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/30',
        medium: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
        low: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      status: 'pending',
      size: 'md',
    },
  }
);

// Icon mapping for each status
const statusIcons = {
  // Appointments
  scheduled: Clock,
  confirmed: CheckCircle2,
  completed: CheckCircle2,
  cancelled: XCircle,
  'no-show': XCircle,
  pending: Clock,

  // Payments
  paid: CheckCircle2,
  unpaid: XCircle,
  'partially-paid': AlertCircle,
  refunded: Circle,

  // General
  active: CheckCircle2,
  inactive: Circle,
  draft: Circle,
  archived: Circle,

  // Alerts
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
  info: AlertCircle,

  // Priority
  critical: AlertCircle,
  high: AlertCircle,
  medium: AlertCircle,
  low: Circle,
} as const;

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  showIcon?: boolean;
  pulse?: boolean;
}

/**
 * Status Badge Component
 *
 * Enhanced badge component with improved contrast and visual indicators.
 * Designed for better accessibility and clear status communication.
 *
 * Features:
 * - High contrast colors for better readability
 * - Status-specific icons
 * - Optional pulse animation for active statuses
 * - Dark mode support
 * - Semantic status types
 *
 * @example
 * <StatusBadge status="confirmed" showIcon />
 * <StatusBadge status="pending" pulse />
 * <StatusBadge status="critical" size="lg" />
 */
function StatusBadge({
  className,
  status = 'pending',
  size = 'md',
  showIcon = true,
  pulse = false,
  children,
  ...props
}: StatusBadgeProps) {
  const Icon = status && statusIcons[status] ? statusIcons[status] : null;

  return (
    <span
      className={cn(
        statusBadgeVariants({ status, size }),
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {showIcon && Icon && <Icon className="h-3.5 w-3.5" />}
      {children || formatStatusLabel(status || 'pending')}
    </span>
  );
}

/**
 * Format status string for display
 */
function formatStatusLabel(status: string): string {
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Appointment Status Badge - Specific to appointment statuses
 */
export function AppointmentStatusBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, 'status'> & {
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show' | 'pending';
}) {
  return <StatusBadge status={status} {...props} />;
}

/**
 * Payment Status Badge - Specific to payment statuses
 */
export function PaymentStatusBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, 'status'> & {
  status: 'paid' | 'unpaid' | 'partially-paid' | 'refunded';
}) {
  return <StatusBadge status={status} {...props} />;
}

/**
 * Priority Badge - For tasks, tickets, etc.
 */
export function PriorityBadge({
  priority,
  ...props
}: Omit<StatusBadgeProps, 'status'> & {
  priority: 'critical' | 'high' | 'medium' | 'low';
}) {
  return <StatusBadge status={priority} {...props} />;
}

export { StatusBadge, statusBadgeVariants };
