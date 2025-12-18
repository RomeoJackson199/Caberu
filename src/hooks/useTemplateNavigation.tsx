/**
 * Stub hook - Template navigation removed since we standardized on healthcare.
 * Returns healthcare navigation items.
 */
import { ForwardRefExoticComponent, RefAttributes } from "react";
import { LucideProps } from "lucide-react";

export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon?: string | ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
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
        // Stub for removed restaurant functionality
        filterNavItems: <T extends NavItem>(items: T[]) => items,
        getRestaurantNavItems: [] as NavItem[],
        isRestaurant: false,
    };
}
