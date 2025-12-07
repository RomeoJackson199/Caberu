/**
 * Stub hook that replaced the template system.
 * All features are now enabled by default since we standardized on healthcare template.
 */

export function useBusinessTemplate() {
    return {
        template: 'healthcare',
        templateConfig: null,
        loading: false,
        hasFeature: () => true, // All features enabled
        t: (key: string) => key, // Simple passthrough for translations
        featureLabels: {} as Record<string, string>,
    };
}
