import { supabase } from "@/integrations/supabase/client";

interface PracticeConsentData {
    generalConsent: boolean;
    dataProcessingConsent: boolean;
    termsAccepted: boolean;
    timestamp: string;
}

interface PatientConsentData {
    healthDataConsent: boolean;
    dataProcessingConsent: boolean;
    understandRights: boolean;
    consentDate: string;
}

/**
 * Save practice consent to database after business signup
 * Call this after the dentist profile is created
 */
export async function savePracticeConsent(practiceId: string): Promise<boolean> {
    try {
        // Get consent data from sessionStorage (auth-sensitive)
        const consentJson = sessionStorage.getItem('pending_practice_consent');
        if (!consentJson) {

            return false;
        }

        const consentData: PracticeConsentData = JSON.parse(consentJson);

        // Save to database
        const { error } = await supabase
            .from('practice_consents')
            .insert({
                practice_id: practiceId,
                general_consent: consentData.generalConsent,
                data_processing_consent: consentData.dataProcessingConsent,
                terms_accepted: consentData.termsAccepted,
                consent_date: consentData.timestamp,
                user_agent: navigator.userAgent,
            });

        if (error) {
            console.error('Error saving practice consent:', error);
            return false;
        }

        // Clear the pending consent
        sessionStorage.removeItem('pending_practice_consent');

        return true;
    } catch (error) {
        console.error('Error saving practice consent:', error);
        return false;
    }
}

/**
 * Save patient health data consent to database
 * Call this when a patient agrees to health data processing
 */
export async function savePatientConsent(
    patientId: string,
    practiceId: string,
    consentData: PatientConsentData
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('patient_consents')
            .insert({
                patient_id: patientId,
                practice_id: practiceId,
                health_data_consent: consentData.healthDataConsent,
                data_processing_consent: consentData.dataProcessingConsent,
                understand_rights: consentData.understandRights,
                consent_date: consentData.consentDate,
                user_agent: navigator.userAgent,
            });

        if (error) {
            console.error('Error saving patient consent:', error);
            return false;
        }


        return true;
    } catch (error) {
        console.error('Error saving patient consent:', error);
        return false;
    }
}

/**
 * Withdraw patient consent (GDPR right to withdraw)
 */
export async function withdrawPatientConsent(
    consentId: string,
    reason?: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('patient_consents')
            .update({
                withdrawn_at: new Date().toISOString(),
                withdrawal_reason: reason,
            })
            .eq('id', consentId);

        if (error) {
            console.error('Error withdrawing patient consent:', error);
            return false;
        }


        return true;
    } catch (error) {
        console.error('Error withdrawing patient consent:', error);
        return false;
    }
}

/**
 * Check if there's pending practice consent to save
 */
export function hasPendingPracticeConsent(): boolean {
    return sessionStorage.getItem('pending_practice_consent') !== null;
}
