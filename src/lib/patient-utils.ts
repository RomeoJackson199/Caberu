import { differenceInYears } from 'date-fns';

/**
 * Calculate age from date of birth
 */
export function getAge(dob?: string | null): number | null {
  if (!dob) return null;
  try {
    return differenceInYears(new Date(), new Date(dob));
  } catch {
    return null;
  }
}

/**
 * Check if patient has medical risk indicators in their history
 */
export function hasMedicalRisk(medicalHistory?: string | null): boolean {
  if (!medicalHistory) return false;
  const history = medicalHistory.toLowerCase();
  return (
    history.includes('allerg') ||
    history.includes('condition') ||
    history.includes('medication') ||
    history.includes('diabetes') ||
    history.includes('heart') ||
    history.includes('blood')
  );
}

/**
 * Get status color class for appointment/treatment status badges
 */
export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'confirmed':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'active':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
    case 'cancelled':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'draft':
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get initials from name
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return first + last || '?';
}

/**
 * Format patient display name
 */
export function formatPatientName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown Patient';
}
