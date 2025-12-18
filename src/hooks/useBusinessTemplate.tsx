/**
 * Stub hook that replaced the template system.
 * All features are now enabled by default since we standardized on healthcare template.
 */

// Terminology translations for healthcare template
const healthcareTerminology: Record<string, string> = {
    customer: 'Patient',
    customerPlural: 'Patients',
    service: 'Treatment',
    servicePlural: 'Treatments',
    appointment: 'Appointment',
    appointmentPlural: 'Appointments',
    provider: 'Dentist',
    providerPlural: 'Dentists',
    business: 'Practice',
    businessPlural: 'Practices',
};

export function useBusinessTemplate() {
    return {
        template: 'healthcare',
        templateConfig: null,
        loading: false,
        hasFeature: (_feature?: string) => true, // All features enabled
        t: (key: string) => healthcareTerminology[key] || key, // Return translated term or key as fallback
        featureLabels: {} as Record<string, string>,
    };
}
