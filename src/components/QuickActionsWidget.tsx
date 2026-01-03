import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  FileText,
  Clock,
  TrendingUp,
  Pill,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  description?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

export interface RecentItem {
  id: string;
  label: string;
  href: string;
  timestamp: Date;
  icon?: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}

interface StoredRecentItem {
  id: string;
  label: string;
  href: string;
  timestamp: string; // stored as ISO string
  subtitle?: string;
}

interface QuickActionsWidgetProps {
  actions?: QuickAction[];
  recentItems?: RecentItem[];
  maxRecentItems?: number;
  className?: string;
  title?: string;
}

// Default quick actions for different user roles
const defaultQuickActions: QuickAction[] = [
  {
    id: 'new-appointment',
    label: 'Book Appointment',
    icon: Calendar,
    href: '/book-appointment',
    description: 'Schedule a new appointment',
    variant: 'primary',
  },
  {
    id: 'view-patients',
    label: 'View Patients',
    icon: Users,
    href: '/patients',
    description: 'Manage patient records',
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    icon: Pill,
    href: '/care/prescriptions',
    description: 'View your prescriptions',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    href: '/messages',
    description: 'Check your messages',
  },
];

/**
 * Quick Actions Widget
 *
 * Displays frequently used actions and recently accessed items
 * for faster navigation and improved workflow.
 *
 * Features:
 * - Customizable quick actions
 * - Recent items with timestamps
 * - Auto-saves recent items to localStorage
 * - Responsive grid layout
 *
 * @example
 * <QuickActionsWidget
 *   actions={customActions}
 *   recentItems={recentPatients}
 * />
 */
export function QuickActionsWidget({
  actions = defaultQuickActions,
  recentItems = [],
  maxRecentItems = 5,
  className,
  title = 'Quick Actions',
}: QuickActionsWidgetProps) {
  const [localRecentItems, setLocalRecentItems] = useState<RecentItem[]>([]);

  // Load recent items from localStorage and listen for changes
  useEffect(() => {
    const loadRecentItems = () => {
      try {
        const stored = localStorage.getItem('recentItems');
        if (stored) {
          const parsed: StoredRecentItem[] = JSON.parse(stored);
          setLocalRecentItems(
            parsed.map((item) => ({
              ...item,
              timestamp: new Date(item.timestamp),
            }))
          );
        }
      } catch (error) {
        logger.error('Failed to load recent items', { error });
      }
    };

    // Load on mount
    loadRecentItems();

    // Listen for storage changes (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recentItems') {
        loadRecentItems();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Combine and deduplicate recent items by ID
  const allRecentItems = (() => {
    const itemMap = new Map<string, RecentItem>();

    // Add all items to map, keeping the one with latest timestamp
    [...recentItems, ...localRecentItems].forEach((item) => {
      const existing = itemMap.get(item.id);
      if (!existing || item.timestamp.getTime() > existing.timestamp.getTime()) {
        itemMap.set(item.id, item);
      }
    });

    // Convert to array, sort by timestamp desc, and limit
    return Array.from(itemMap.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxRecentItems);
  })();

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {actions.map((action) => (
              <Link
                key={action.id}
                to={action.href}
                className="group"
              >
                <Button
                  variant={action.variant === 'primary' ? 'default' : 'outline'}
                  className="w-full h-auto flex flex-col items-center gap-2 p-4 hover:scale-105 transition-transform"
                >
                  <action.icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{action.label}</div>
                    {action.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {action.description}
                      </div>
                    )}
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Items */}
      {allRecentItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allRecentItems.map((item) => {
                const Icon = item.icon || FileText;
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {item.label}
                        </div>
                        {item.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(item.timestamp)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Hook to track and save recent items
 *
 * @example
 * const { addRecentItem } = useRecentItems();
 *
 * // When user views a patient
 * addRecentItem({
 *   id: 'patient-123',
 *   label: 'John Doe',
 *   href: '/patients/123',
 *   icon: Users,
 *   subtitle: 'Last visit: 2 days ago'
 * });
 */
export function useRecentItems() {
  const addRecentItem = (item: Omit<RecentItem, 'timestamp'>) => {
    try {
      const stored = localStorage.getItem('recentItems');
      const existing: RecentItem[] = stored ? JSON.parse(stored) : [];

      // Remove duplicate if exists
      const filtered = existing.filter((i) => i.id !== item.id);

      // Add new item at the beginning
      const updated = [
        { ...item, timestamp: new Date() },
        ...filtered,
      ].slice(0, 20); // Keep max 20 items

      localStorage.setItem('recentItems', JSON.stringify(updated));
    } catch (error) {
      logger.error('Failed to save recent item', { error });
    }
  };

  const clearRecentItems = () => {
    try {
      localStorage.removeItem('recentItems');
    } catch (error) {
      logger.error('Failed to clear recent items', { error });
    }
  };

  return { addRecentItem, clearRecentItems };
}
