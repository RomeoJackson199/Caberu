/**
 * GDPR Compliance Module
 * Central export for all GDPR-related utilities and types.
 */
export {
  logAuditEvent,
  logDataAccess,
  logAuthEvent,
  logExport,
  logDeletion,
  logConsentChange,
  type AuditAction,
  type AuditLogEntry,
  type PurposeCode,
} from './auditLogger';

export {
  grantConsent,
  withdrawConsent,
  hasConsent,
  getPatientConsents,
  grantBulkConsent,
  type ConsentScope,
  type ConsentStatus,
  type ConsentRecord,
  type GrantConsentParams,
} from './consentManager';

export {
  submitGdprRequest,
  getPatientGdprRequests,
  getPendingGdprRequests,
  updateGdprRequestStatus,
  exportPatientData,
  anonymizePatientData,
  restrictPatientProcessing,
  type GdprRequestType,
  type GdprRequestStatus,
  type GdprRequest,
  type PatientDataExport,
} from './dataSubjectRights';

export {
  RETENTION_RULES,
  getRetentionRule,
  getRetentionSummary,
  type RetentionRule,
} from './retentionPolicy';

export {
  reportBreachIncident,
  getBreachIncidents,
  updateBreachStatus,
  markAuthorityNotified,
  markPatientsNotified,
  getNotificationDeadlineHours,
  type BreachSeverity,
  type BreachStatus,
  type BreachIncident,
} from './breachDetection';
