/**
 * Stub hook - Template navigation removed since we standardized on healthcare.
 * Returns healthcare navigation items.
 */

interface NavItem {
    id: string;
    label: string;
    path: string;
    icon?: string;
}

export function useTemplateNavigation() {
    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', path: '/dentist/dashboard' },
        { id: 'appointments', label: 'Appointments', path: '/dentist/appointments' },
        { id: 'patients', label: 'Patients', path: '/dentist/patients' },
        { id: 'clinical', label: 'Clinical', path: '/dentist/clinical' },
        { id: 'payments', label: 'Payments', path: '/dentist/payments' },
        { id: 'inventory', label: 'Inventory', path: '/dentist/inventory' },
        { id: 'analytics', label: 'Analytics', path: '/dentist/analytics' },
        { id: 'settings', label: 'Settings', path: '/dentist/settings' },
    ];

    return {
        navItems,
        getNavItems: () => navItems,
        hasNavItem: () => true,
    };
}
