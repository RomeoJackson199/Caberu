import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

// Convert base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Fetch VAPID public key from edge function
  private async getVapidPublicKey(): Promise<string | null> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      
      if (error) {
        logger.error('Failed to fetch VAPID key:', error);
        return null;
      }

      this.vapidPublicKey = data?.publicKey || null;
      return this.vapidPublicKey;
    } catch (error) {
      logger.error('Error fetching VAPID key:', error);
      return null;
    }
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Check current notification permission
  getPermission(): NotificationPermission {
    return Notification.permission;
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Register service worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported()) {
      throw new Error('Service workers are not supported in this browser');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      logger.info('Service Worker registered successfully:', this.registration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      return this.registration;
    } catch (error) {
      logger.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Subscribe to push notifications
  async subscribe(forceResubscribe = false): Promise<PushSubscription | null> {
    try {
      // Request permission first
      const permission = await this.requestPermission();

      if (permission !== 'granted') {
        logger.info('Notification permission denied');
        return null;
      }

      // Register service worker if not already registered
      if (!this.registration) {
        this.registration = await this.registerServiceWorker();
      }

      // Get VAPID key
      const vapidKey = await this.getVapidPublicKey();
      if (!vapidKey) {
        logger.error('VAPID public key not configured - cannot subscribe');
        throw new Error('Push notifications are not configured. Please contact support.');
      }

      // Check if already subscribed
      const existingSubscription = await this.registration.pushManager.getSubscription();

      if (existingSubscription) {
        // Check if the existing subscription uses the correct VAPID key
        // If force resubscribe or keys may have changed, unsubscribe first
        logger.info('Found existing subscription, checking if valid...');
        
        if (forceResubscribe) {
          logger.info('Force resubscribe requested - unsubscribing from existing subscription');
          try {
            await existingSubscription.unsubscribe();
          } catch (e) {
            logger.warn('Failed to unsubscribe from existing subscription:', e);
          }
        } else {
          // Try to save/update the existing subscription
          try {
            await this.saveSubscription(existingSubscription);
            logger.info('Existing subscription is valid and saved');
            return existingSubscription;
          } catch (saveError) {
            logger.warn('Failed to save existing subscription, will resubscribe:', saveError);
            try {
              await existingSubscription.unsubscribe();
            } catch (e) {
              logger.warn('Failed to unsubscribe:', e);
            }
          }
        }
      }

      // Subscribe to push notifications with the VAPID key
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      logger.info('Creating new push subscription...');
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      });

      logger.info('Push subscription successful:', subscription);
      logger.info('Endpoint:', subscription.endpoint);

      // Save subscription to database
      await this.saveSubscription(subscription);

      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.registration) {
        this.registration = await navigator.serviceWorker.getRegistration() ?? null;
      }

      if (!this.registration) {
        return false;
      }

      const subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        return false;
      }

      // Remove subscription from database
      await this.removeSubscription(subscription);

      // Unsubscribe
      const result = await subscription.unsubscribe();
      logger.info('Unsubscribed from push notifications:', result);

      return result;
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Check if currently subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        return false;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      logger.error('Failed to check subscription status:', error);
      return false;
    }
  }

  // Get current subscription
  async getSubscription(): Promise<PushSubscription | null> {
    try {
      if (!this.registration) {
        this.registration = await navigator.serviceWorker.getRegistration() ?? null;
      }

      if (!this.registration) {
        return null;
      }

      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      logger.error('Failed to get subscription:', error);
      return null;
    }
  }

  // Save subscription to database
  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const subscriptionData = subscription.toJSON();

      // Save to push_subscriptions table
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh_key: subscriptionData.keys?.p256dh,
          auth_key: subscriptionData.keys?.auth,
          user_agent: navigator.userAgent,
          is_active: true
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        // Handle RLS policy violations gracefully
        if (error.code === '42501') {
          logger.warn('Push subscription save blocked by RLS - will retry on next visit');
          return;
        }
        logger.error('Failed to save subscription to database:', error);
        throw error;
      }

      logger.info('Subscription saved to database');
    } catch (error) {
      logger.error('Error saving subscription:', error);
      throw error;
    }
  }

  // Remove subscription from database
  private async removeSubscription(subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionData = subscription.toJSON();

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', subscriptionData.endpoint);

      if (error) {
        // Handle RLS policy violations gracefully
        if (error.code === '42501') {
          logger.warn('Push subscription removal blocked by RLS - subscription may remain active');
          return;
        }
        logger.error('Failed to remove subscription from database:', error);
        throw error;
      }

      logger.info('Subscription removed from database');
    } catch (error) {
      logger.error('Error removing subscription:', error);
      throw error;
    }
  }

  // Show a local notification (for testing)
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Notifications are not supported');
    }

    if (Notification.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    if (!this.registration) {
      this.registration = await this.registerServiceWorker();
    }

    await this.registration.showNotification(title, {
      icon: '/logo.png',
      badge: '/badge.png',
      ...options
    });
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

// Helper function to initialize push notifications
export async function initializePushNotifications(): Promise<boolean> {
  try {
    const service = pushNotificationService;

    if (!service.isSupported()) {
      logger.info('Push notifications not supported in this browser');
      return false;
    }

    if (service.getPermission() === 'granted') {
      await service.subscribe();
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to initialize push notifications:', error);
    return false;
  }
}

// Debug function to test push notifications - can be called from browser console
export async function testPushNotifications(): Promise<void> {
  logger.info('=== Push Notification Debug ===');

  const service = pushNotificationService;

  // Check support
  logger.info('1. Browser support:', service.isSupported());
  if (!service.isSupported()) {
    logger.error('Push notifications not supported in this browser');
    return;
  }

  // Check permission
  logger.info('2. Permission status:', service.getPermission());

  // Check service worker
  const registration = await navigator.serviceWorker.getRegistration();
  logger.info('3. Service worker registered:', !!registration);

  // Check subscription
  const subscription = await service.getSubscription();
  logger.info('4. Current subscription:', subscription ? 'Active' : 'None');
  if (subscription) {
    logger.info('   Endpoint:', subscription.endpoint);
  }

  // Test local notification via service worker
  if (registration && service.getPermission() === 'granted') {
    logger.info('5. Sending test notification via service worker...');
    registration.active?.postMessage({ type: 'TEST_NOTIFICATION' });
    logger.info('   Test notification sent! Check if it appears.');
  } else {
    logger.info('5. Cannot send test notification - permission not granted or no service worker');
  }

  logger.info('=== End Debug ===');
}

// Make test function available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).testPushNotifications = testPushNotifications;
  (window as any).pushNotificationService = pushNotificationService;
}
