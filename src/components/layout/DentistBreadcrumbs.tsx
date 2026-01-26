import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export type DentistSection =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'employees'
  | 'messages'
  | 'clinical'
  | 'schedule'
  | 'payments'
  | 'analytics'
  | 'reports'
  | 'inventory'
  | 'imports'
  | 'branding'
  | 'security'
  | 'users'
  | 'team'
  | 'settings'
  | 'services';

interface BreadcrumbItem {
  label: string;
  path?: string;
  section?: DentistSection;
}

interface DentistBreadcrumbsProps {
  activeSection: DentistSection;
  className?: string;
  onChangeSection?: (section: DentistSection) => void;
}

const sectionLabels: Record<DentistSection, string> = {
  dashboard: 'Dashboard',
  patients: 'Patients',
  appointments: 'Appointments',
  employees: 'Employees',
  messages: 'Messages',
  clinical: 'Clinical',
  schedule: 'Schedule',
  payments: 'Payments',
  analytics: 'Analytics',
  reports: 'Reports',
  inventory: 'Inventory',
  imports: 'Data Imports',
  branding: 'Branding',
  security: 'Security',
  users: 'Users',
  team: 'Team',
  settings: 'Settings',
  services: 'Services'
};

const sectionPaths: Record<DentistSection, string> = {
  dashboard: '/dentist/dashboard',
  patients: '/dentist/patients',
  appointments: '/dentist/appointments',
  employees: '/dentist/employees',
  messages: '/dentist/messages',
  clinical: '/dentist/clinical',
  schedule: '/dentist/schedule',
  payments: '/dentist/payments',
  analytics: '/dentist/analytics',
  reports: '/dentist/reports',
  inventory: '/dentist/inventory',
  imports: '/dentist/imports',
  branding: '/dentist/branding',
  security: '/dentist/security',
  users: '/dentist/users',
  team: '/dentist/team',
  settings: '/dentist/settings',
  services: '/dentist/services'
};

export function DentistBreadcrumbs({
  activeSection,
  className,
  onChangeSection
}: DentistBreadcrumbsProps) {
  const navigate = useNavigate();

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', section: 'dashboard', path: '/dentist/dashboard' },
  ];

  // Add current section if not dashboard
  if (activeSection !== 'dashboard') {
    breadcrumbs.push({
      label: sectionLabels[activeSection],
      section: activeSection,
      path: sectionPaths[activeSection]
    });
  }

  const handleClick = (item: BreadcrumbItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.section && onChangeSection) {
      onChangeSection(item.section);
    }
  };

  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)} aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={item.label} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground flex items-center gap-1.5">
                {index === 0 && <Home className="h-3.5 w-3.5" />}
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => handleClick(item)}
                className="hover:text-foreground transition-colors flex items-center gap-1.5 hover:underline"
              >
                {index === 0 && <Home className="h-3.5 w-3.5" />}
                {item.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
