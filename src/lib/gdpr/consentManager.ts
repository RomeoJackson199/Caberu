/**
 * GDPR Consent Management System
 * Handles granular consent collection, withdrawal, and verification.
 */
import { supabase } from '@/integrations/supabase/client';
import { logConsentChange } from './auditLogger';

export type ConsentScope =
  | 'health_data_processing'
  | 'ai_intake'
  | 'notifications'
  | 'marketing'
  | 'analytics';

export type ConsentStatus = 'granted' | 'withdrawn' | 'expired';

export interface ConsentRecord {
  id: string;
  patient_id: string;
  scope: ConsentScope;
  status: ConsentStatus;
  granted_at: string;
  withdrawn_at: string | null;
  expires_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  legal_basis: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface GrantConsentParams {
  patientId: string;
  scope: ConsentScope;
  legalBasis?: string;
  version?: number;
  actorId: string;
}

/**
 * Grant consent for a specific scope.
 */
export async function grantConsent(params: GrantConsentParams): Promise<{ success: boolean; error?: string }> {
  const { patientId, scope, legalBasis = 'consent', version = 1, actorId } = params;

  // Check for existing active consent of same scope
  const { data: existing } = await supabase
    .from('consent_records')
    .select('id')
    .eq('patient_id', patientId)
    .eq('scope', scope)
    .eq('status', 'granted')
    .maybeSingle();

  if (existing) {
    return { success: true }; // Already granted
  }

  const { error } = await supabase.from('consent_records').insert({
    patient_id: patientId,
    scope,
    status: 'granted',
    granted_at: new Date().toISOString(),
    legal_basis: legalBasis,
    version,
    user_agent: navigator.userAgent,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  await logConsentChange(actorId, patientId, scope, true);
  return { success: true };
}

/**
 * Withdraw consent for a specific scope.
 */
export async function withdrawConsent(
  patientId: string,
  scope: ConsentScope,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('consent_records')
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
    })
    .eq('patient_id', patientId)
    .eq('scope', scope)
    .eq('status', 'granted');

  if (error) {
    return { success: false, error: error.message };
  }

  await logConsentChange(actorId, patientId, scope, false);
  return { success: true };
}

/**
 * Check if consent is currently granted and not expired for a specific scope.
 */
export async function hasConsent(
  patientId: string,
  scope: ConsentScope
): Promise<boolean> {
  const { data } = await supabase
    .from('consent_records')
    .select('id, expires_at')
    .eq('patient_id', patientId)
    .eq('scope', scope)
    .eq('status', 'granted')
    .maybeSingle();

  if (!data) return false;

  // Check if consent has expired
  if (data.expires_at) {
    const expiryDate = new Date(data.expires_at);
    if (expiryDate < new Date()) {
      // Auto-expire the consent record
      await supabase
        .from('consent_records')
        .update({ status: 'expired' })
        .eq('id', data.id);
      return false;
    }
  }

  return true;
}

/**
 * Get all consent records for a patient.
 */
export async function getPatientConsents(
  patientId: string
): Promise<ConsentRecord[]> {
  const { data, error } = await supabase
    .from('consent_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ConsentManager] Failed to fetch consents:', error.message);
    return [];
  }

  return (data ?? []) as ConsentRecord[];
}

/**
 * Grant multiple consent scopes at once (e.g., during onboarding).
 */
export async function grantBulkConsent(
  patientId: string,
  scopes: ConsentScope[],
  actorId: string,
  legalBasis = 'consent'
): Promise<{ success: boolean; error?: string }> {
  for (const scope of scopes) {
    const result = await grantConsent({
      patientId,
      scope,
      legalBasis,
      actorId,
    });
    if (!result.success) {
      return result;
    }
  }
  return { success: true };
}
