import * as React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
  separator?: React.ReactNode;
}

/**
 * Breadcrumbs Navigation Component
 *
 * Provides hierarchical navigation context for nested pages.
 * Helps users understand where they are in the app and navigate back.
 *
 * @example
 * <Breadcrumbs
 *   items={[
 *     { label: 'Patients', href: '/patients' },
 *     { label: 'John Doe', href: '/patients/123' },
 *     { label: 'Treatment History' }
 *   ]}
 * />
 */
export function Breadcrumbs({
  items,
  showHome = true,
  className,
  separator = <ChevronRight className="h-4 w-4" />,
}: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: 'Home', href: '/', icon: Home }, ...items]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center space-x-1">
              {index > 0 && (
                <span className="text-muted-foreground" aria-hidden="true">
                  {separator}
                </span>
              )}

              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'text-muted-foreground hover:text-foreground',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-1'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-1',
                    isLast
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Auto-generate breadcrumbs from pathname
 * Useful for consistent breadcrumb generation across routes
 *
 * @example
 * const breadcrumbs = useBreadcrumbs('/patients/123/treatment-history');
 * // Returns: [
 * //   { label: 'Patients', href: '/patients' },
 * //   { label: '123', href: '/patients/123' },
 * //   { label: 'Treatment History' }
 * // ]
 */
export function useBreadcrumbs(pathname: string, labels?: Record<string, string>): BreadcrumbItem[] {
  return React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);

    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const isLast = index === segments.length - 1;

      // Format label: replace hyphens with spaces and capitalize
      const defaultLabel = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const label = labels?.[segment] || labels?.[href] || defaultLabel;

      return {
        label,
        href: isLast ? undefined : href,
      };
    });
  }, [pathname, labels]);
}
