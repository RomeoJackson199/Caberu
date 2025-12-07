/**
 * Stub template utilities - replaced with healthcare-only config.
 */

export type TemplateType = 'healthcare' | 'dentist';

export interface TemplateConfig {
    id: string;
    label: string;
    features: string[];
}

const healthcareConfig: TemplateConfig = {
    id: 'healthcare',
    label: 'Healthcare',
    features: [
        'appointments',
        'patients',
        'prescriptions',
        'treatmentPlans',
        'medicalRecords',
        'paymentRequests',
        'inventory',
        'analytics',
    ],
};

export function getTemplateConfig(_template?: string): TemplateConfig {
    return healthcareConfig;
}

export function getAllTemplates(): TemplateConfig[] {
    return [healthcareConfig];
}

export function hasFeature(_template: string, _feature: string): boolean {
    return true; // All features enabled
}
