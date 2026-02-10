/**
 * GDPR Data Retention Policy Configuration
 * Defines retention periods for all data types and provides
 * utilities for identifying data that should be purged.
 */

export interface RetentionRule {
  entityType: string;
  tableName: string;
  retentionDays: number;
  legalBasis: string;
  action: 'delete' | 'anonymize';
  dateField: string;
  description: string;
}

/**
 * Retention rules aligned with Belgian healthcare and tax regulations.
 */
export const RETENTION_RULES: RetentionRule[] = [
  {
    entityType: 'call_recordings',
    tableName: 'phone_usage',
    retentionDays: 30,
    legalBasis: 'Consent - Voice recordings auto-expire',
    action: 'delete',
    dateField: 'created_at',
    description: 'Voice call recordings and metadata',
  },
  {
    entityType: 'ai_transcripts',
    tableName: 'communication_logs',
    retentionDays: 90,
    legalBasis: 'Consent - AI processing records',
    action: 'delete',
    dateField: 'created_at',
    description: 'AI conversation transcripts and analysis',
  },
  {
    entityType: 'chat_messages',
    tableName: 'messages',
    retentionDays: 90,
    legalBasis: 'Contract performance - Communication records',
    action: 'delete',
    dateField: 'created_at',
    description: 'Patient-practice chat messages',
  },
  {
    entityType: 'sms_notifications',
    tableName: 'sms_notifications',
    retentionDays: 90,
    legalBasis: 'Contract performance - Notification delivery records',
    action: 'delete',
    dateField: 'created_at',
    description: 'SMS notification delivery logs',
  },
  {
    entityType: 'email_logs',
    tableName: 'email_event_logs',
    retentionDays: 90,
    legalBasis: 'Contract performance - Email delivery records',
    action: 'delete',
    dateField: 'created_at',
    description: 'Email notification delivery logs',
  },
  {
    entityType: 'appointment_history',
    tableName: 'appointments',
    retentionDays: 2555, // ~7 years
    legalBasis: 'Legal obligation - Belgian healthcare records law',
    action: 'anonymize',
    dateField: 'appointment_date',
    description: 'Appointment records (anonymized after retention)',
  },
  {
    entityType: 'patient_data',
    tableName: 'patients',
    retentionDays: 730, // 2 years after last interaction
    legalBasis: 'Contract performance - Active patient management',
    action: 'anonymize',
    dateField: 'updated_at',
    description: 'Patient personal data (anonymized when inactive)',
  },
  {
    entityType: 'billing_records',
    tableName: 'payment_requests',
    retentionDays: 2555, // ~7 years
    legalBasis: 'Legal obligation - Belgian tax law (7 years)',
    action: 'anonymize',
    dateField: 'created_at',
    description: 'Payment and billing records',
  },
  {
    entityType: 'audit_logs',
    tableName: 'gdpr_audit_log',
    retentionDays: 2555, // ~7 years
    legalBasis: 'Legal obligation - Compliance audit trail',
    action: 'delete',
    dateField: 'created_at',
    description: 'GDPR audit log entries',
  },
  {
    entityType: 'prescriptions',
    tableName: 'prescriptions',
    retentionDays: 2555, // ~7 years
    legalBasis: 'Legal obligation - Belgian medical records law',
    action: 'anonymize',
    dateField: 'created_at',
    description: 'Prescription records',
  },
  {
    entityType: 'treatment_plans',
    tableName: 'treatment_plans',
    retentionDays: 2555, // ~7 years
    legalBasis: 'Legal obligation - Belgian medical records law',
    action: 'anonymize',
    dateField: 'created_at',
    description: 'Treatment plan records',
  },
  {
    entityType: 'cancelled_appointments',
    tableName: 'appointments',
    retentionDays: 30,
    legalBasis: 'Legitimate interest - Short-term record keeping',
    action: 'delete',
    dateField: 'updated_at',
    description: 'Cancelled appointment records',
  },
];

/**
 * Get the retention rule for a specific entity type.
 */
export function getRetentionRule(entityType: string): RetentionRule | undefined {
  return RETENTION_RULES.find((r) => r.entityType === entityType);
}

/**
 * Get all retention rules formatted for display.
 */
export function getRetentionSummary(): Array<{
  dataType: string;
  retention: string;
  legalBasis: string;
}> {
  return RETENTION_RULES.map((rule) => ({
    dataType: rule.description,
    retention: formatRetentionPeriod(rule.retentionDays),
    legalBasis: rule.legalBasis,
  }));
}

function formatRetentionPeriod(days: number): string {
  if (days <= 30) return `${days} days`;
  if (days <= 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}
