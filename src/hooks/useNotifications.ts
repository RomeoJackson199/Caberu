import { useState, useEffect, useCallback, useRef } from 'react';
import { Notification, NotificationPreferences } from '../types/common';
import { NotificationService } from '../lib/notificationService';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const useNotifications = (userIdProp?: string): UseNotificationsReturn => {
  const [userId, setUserId] = useState<string | null>(userIdProp || null);
  
  // Get current user if not provided
  useEffect(() => {
    if (!userIdProp) {
      supabase.auth.getUser().then(({ data }) => {
        setUserId(data.user?.id || null);
      });
    }
  }, [userIdProp]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced state update to prevent rapid changes
  const debouncedSetUnreadCount = useCallback((newCount: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setUnreadCount(newCount);
    }, 100);
  }, []);

  // Fetch notifications and preferences
  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [notificationsData, unreadCountData, preferencesData] = await Promise.all([
        NotificationService.getNotifications(userId, 50),
        NotificationService.getUnreadCount(userId),
        NotificationService.getNotificationPreferences(userId)
      ]);

      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
      setPreferences(preferencesData);
    } catch (err) {
      logger.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      debouncedSetUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      logger.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, [unreadCount, debouncedSetUnreadCount]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      logger.error('Error marking all notifications as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, []);

  // Update notification preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!userId) return;

    try {
      const updatedPrefs = await NotificationService.updateNotificationPreferences(userId, updates);
      setPreferences(updatedPrefs);
    } catch (err) {
      logger.error('Error updating notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update notification preferences');
    }
  }, [userId]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;

    const subscription = NotificationService.subscribeToNotifications(userId, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
      if (!newNotification.is_read) {
        debouncedSetUnreadCount(unreadCount + 1);
      }
    });

    return () => {
      NotificationService.unsubscribeFromNotifications(userId);
    };
  }, [userId, debouncedSetUnreadCount]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    refreshNotifications
  };
};