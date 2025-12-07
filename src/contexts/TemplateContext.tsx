import React, { createContext, useContext } from 'react';

/**
 * Stub template context that replaced the old template system.
 * All features are now enabled by default.
 */

interface TemplateContextType {
    template: string;
    hasFeature: (feature: string) => boolean;
    updateTemplate: (template: string) => Promise<void>;
    loading: boolean;
}

const TemplateContext = createContext<TemplateContextType>({
    template: 'healthcare',
    hasFeature: () => true,
    updateTemplate: async () => { },
    loading: false,
});

export function useTemplate() {
    return useContext(TemplateContext);
}

export function TemplateProvider({ children }: { children: React.ReactNode }) {
    const value: TemplateContextType = {
        template: 'healthcare',
        hasFeature: () => true,
        updateTemplate: async () => { },
        loading: false,
    };

    return (
        <TemplateContext.Provider value={value}>
            {children}
        </TemplateContext.Provider>
    );
}

export default TemplateContext;
