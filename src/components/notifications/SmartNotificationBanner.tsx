import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  Clock,
  ChevronRight,
  Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SmartNotificationBannerProps {
  notifications: any[];
  onDismiss?: (id: string) => void;
  onAction?: (notification: any) => void;
  maxVisible?: number;
  autoHide?: boolean;
  position?: 'top' | 'bottom';
  className?: string;
}

export function SmartNotificationBanner({
  notifications,
  onDismiss,
  onAction,
  maxVisible = 3,
  autoHide = false,
  position = 'top',
  className
}: SmartNotificationBannerProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter and prioritize notifications
  useEffect(() => {
    const activeNotifications = notifications
      .filter(n => !dismissedIds.has(n.id) && !n.is_read)
      .sort((a, b) => {
        // Priority mapping: handle both UI values and DB values
        const priorityOrder: Record<string, number> = { urgent: 4, high: 3, normal: 2, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as string] || 0;
        const bPriority = priorityOrder[b.priority as string] || 0;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        // Then by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, maxVisible);

    setVisibleNotifications(activeNotifications);
  }, [notifications, dismissedIds, maxVisible]);

  // Auto-hide functionality
  useEffect(() => {
    if (!autoHide) return;

    const timeouts = visibleNotifications.map((notification, index) => {
      const delay = (index + 1) * 5000; // 5s, 10s, 15s, etc.
      return setTimeout(() => {
        handleDismiss(notification.id);
      }, delay);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [visibleNotifications, autoHide]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    onDismiss?.(id);
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconProps = {
      className: cn(
        "h-4 w-4",
        priority === 'urgent' && "text-red-500 animate-pulse",
        priority === 'high' && "text-orange-500",
        priority === 'normal' && "text-blue-500",
        priority === 'medium' && "text-blue-500", // Backward compatibility
        priority === 'low' && "text-gray-500"
      )
    };

    switch (type) {
      case 'appointment':
        return <Calendar {...iconProps} />;
      case 'payment':
        return <CreditCard {...iconProps} />;
      case 'urgent':
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const getBannerStyle = (notification: any) => {
    const { priority } = notification;
    
    switch (priority) {
      case 'urgent':
        return "bg-red-50 border-red-200 text-red-900";
      case 'high':
        return "bg-orange-50 border-orange-200 text-orange-900";
      case 'medium':
        return "bg-blue-50 border-blue-200 text-blue-900";
      default:
        return "bg-gray-50 border-gray-200 text-gray-900";
    }
  };

  if (visibleNotifications.length === 0) return null;

  const positionClasses = position === 'top' 
    ? "top-4 animate-slide-in-right" 
    : "bottom-4 animate-slide-in-right";

  return (
    <div className={cn(
      "fixed right-4 z-50 space-y-2 max-w-md",
      positionClasses,
      className
    )}>
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border shadow-lg",
            "animate-fade-in backdrop-blur-sm",
            getBannerStyle(notification)
          )}
          style={{ 
            animationDelay: `${index * 200}ms`,
            animationDuration: '300ms'
          }}
        >
          <div className="flex-shrink-0">
            {getNotificationIcon(notification.type, notification.priority)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">
                {notification.title}
              </h4>
              {notification.priority === 'urgent' && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  URGENT
                </Badge>
              )}
            </div>
            
            <p className="text-xs opacity-90 line-clamp-2">
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs opacity-70">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
              
              {notification.action_label && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction?.(notification)}
                  className="text-xs h-6 px-2 hover:bg-white/20"
                >
                  {notification.action_label}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss(notification.id)}
            className="h-6 w-6 p-0 hover:bg-white/20 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      
      {notifications.filter(n => !dismissedIds.has(n.id) && !n.is_read).length > maxVisible && (
        <div className={cn(
          "text-center p-2 rounded-lg border bg-background/80 backdrop-blur-sm",
          "text-xs text-muted-foreground animate-fade-in"
        )}>
          +{notifications.filter(n => !dismissedIds.has(n.id) && !n.is_read).length - maxVisible} more notifications
        </div>
      )}
    </div>
  );
}

// Usage examples for different scenarios
export const UrgentNotificationBanner = (props: Omit<SmartNotificationBannerProps, 'maxVisible'>) => (
  <SmartNotificationBanner {...props} maxVisible={1} autoHide={false} />
);

export const QuietNotificationBanner = (props: Omit<SmartNotificationBannerProps, 'autoHide'>) => (
  <SmartNotificationBanner {...props} autoHide={true} />
);