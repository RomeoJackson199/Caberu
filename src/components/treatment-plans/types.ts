// Treatment Plan types - centralized type definitions

export type TreatmentPlanStatus = 'draft' | 'proposed' | 'superseded' | 'completed';

export interface TreatmentPlanItem {
  id: string;
  treatment_plan_id: string;
  name: string;
  procedure_code?: string | null;
  tooth?: string | null;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  description?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  dentist_id: string;
  business_id: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  status: TreatmentPlanStatus;
  version: number;
  currency: string;
  total_estimated_cents?: number | null;
  created_from_appointment_id?: string | null;
  created_by_dentist_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  items?: TreatmentPlanItem[];
  businesses?: { id: string; name: string } | null;
  dentists?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface TreatmentTemplate {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  default_items: Omit<TreatmentPlanItem, 'id' | 'treatment_plan_id' | 'line_total_cents' | 'created_at' | 'updated_at'>[];
  created_by_dentist_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to format status for display
export function formatPlanStatus(status: TreatmentPlanStatus): string {
  const labels: Record<TreatmentPlanStatus, string> = {
    draft: 'Draft',
    proposed: 'Proposed',
    superseded: 'Superseded',
    completed: 'Completed',
  };
  return labels[status] || status;
}

// Helper to get status badge color
export function getPlanStatusColor(status: TreatmentPlanStatus): string {
  const colors: Record<TreatmentPlanStatus, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200',
    proposed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
    superseded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200',
  };
  return colors[status] || colors.draft;
}

// Helper to calculate total from items
export function calculatePlanTotal(items: TreatmentPlanItem[]): number {
  return items.reduce((sum, item) => sum + (item.line_total_cents || 0), 0);
}

// Format currency amount
export function formatCurrency(cents: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
