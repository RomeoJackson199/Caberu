import { useState, useEffect } from 'react';
import { SmartNotificationBanner } from './SmartNotificationBanner';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global notification banner wrapper that fetches notifications
 * and displays them using SmartNotificationBanner
 */
export function GlobalNotificationBanner() {
  const [userId, setUserId] = useState<string>("");

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  const { notifications, markAsRead } = useNotifications(userId);
  const navigate = useNavigate();

  const handleDismiss = (id: string) => {
    markAsRead(id);
  };

  const handleAction = (notification: any) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to action URL if present
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // Only show unread notifications in the banner
  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Don't render if no user is logged in
  if (!userId) {
    return null;
  }

  return (
    <SmartNotificationBanner
      notifications={unreadNotifications}
      onDismiss={handleDismiss}
      onAction={handleAction}
      maxVisible={3}
      autoHide={false}
      position="top"
    />
  );
}
