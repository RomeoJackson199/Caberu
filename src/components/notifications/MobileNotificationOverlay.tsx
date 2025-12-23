import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Search,
  Calendar,
  CreditCard,
  Pill,
  AlertTriangle,
  Info,
  CheckCheck,
  Settings,
  Filter,
  Trash2,
  Archive
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { SwipeableItem, swipeActionPresets } from '@/components/ui/mobile-interactions';
import { DebouncedSearch, UnreadBadge } from '@/components/ui/page-enhancements';
import { StaggeredList } from '@/components/ui/micro-interactions';

interface MobileNotificationOverlayProps {
  userId: string;
  trigger?: React.ReactNode;
}

export function MobileNotificationOverlay({ userId, trigger }: MobileNotificationOverlayProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications(userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-5 w-5";
    
    switch (type) {
      case 'appointment':
        return <Calendar className={cn(iconClass, "text-blue-500")} />;
      case 'prescription':
        return <Pill className={cn(iconClass, "text-green-500")} />;
      case 'payment':
        return <CreditCard className={cn(iconClass, "text-purple-500")} />;
      case 'warning':
        return <AlertTriangle className={cn(iconClass, "text-yellow-500")} />;
      default:
        return <Info className={cn(iconClass, "text-blue-500")} />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread' && n.is_read) return false;
    if (activeFilter === 'urgent' && n.priority !== 'high') return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(query) || 
             n.message.toLowerCase().includes(query);
    }
    
    return true;
  });

  const handleDismissNotification = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const DefaultTrigger = () => (
    <Button variant="outline" size="sm" className="relative">
      <Bell className="h-4 w-4" />
      <UnreadBadge count={unreadCount} className="absolute -top-2 -right-2" />
    </Button>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || <DefaultTrigger />}
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          
          {/* Mobile-optimized search and filters */}
          <div className="space-y-3 mt-3">
            <DebouncedSearch
              placeholder="Search notifications..."
              onSearch={setSearchQuery}
              delay={200}
            />
            
            <div className="flex gap-2">
              {(['all', 'unread', 'urgent'] as const).map((filter, index) => (
                <motion.div
                  key={filter}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex-1"
                >
                  <Button
                    variant={activeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className="w-full text-xs capitalize"
                  >
                    {filter}
                  </Button>
                </motion.div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              ← Swipe left to dismiss notifications
            </p>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" style={{ height: 'calc(100vh - 220px)' }}>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="w-5 h-5 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-muted-foreground mb-2">
                {searchQuery ? 'No matching notifications' : 'All caught up!'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? 'Try adjusting your search' 
                  : 'New notifications will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredNotifications.map((notification: any, index: number) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100, height: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <SwipeableItem
                      rightActions={[
                        {
                          ...swipeActionPresets.archive,
                          onClick: () => handleDismissNotification(notification.id),
                        },
                      ]}
                      className="rounded-lg overflow-hidden"
                    >
                      <Card
                        className={cn(
                          "cursor-pointer transition-all duration-200",
                          !notification.is_read && "ring-2 ring-primary/20 bg-primary/5"
                        )}
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                          if (notification.action_url) {
                            window.location.href = notification.action_url;
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <motion.div 
                              className="mt-1"
                              whileTap={{ scale: 0.9 }}
                            >
                              {getNotificationIcon(notification.type)}
                            </motion.div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm leading-tight">
                                  {notification.title}
                                </h4>
                                {!notification.is_read && (
                                  <motion.div 
                                    className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                  />
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </span>
                                
                                {notification.action_label && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs h-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!notification.is_read) {
                                        markAsRead(notification.id);
                                      }
                                      if (notification.action_url) {
                                        window.location.href = notification.action_url;
                                      }
                                    }}
                                  >
                                    {notification.action_label}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </SwipeableItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}