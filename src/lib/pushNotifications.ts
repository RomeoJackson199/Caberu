import { supabase } from "@/integrations/supabase/client";

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
        console.error('Failed to fetch VAPID key:', error);
        return null;
      }

      this.vapidPublicKey = data?.publicKey || null;
      return this.vapidPublicKey;
    } catch (error) {
      console.error('Error fetching VAPID key:', error);
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

      console.log('Service Worker registered successfully:', this.registration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscription | null> {
    try {
      // Request permission first
      const permission = await this.requestPermission();

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Register service worker if not already registered
      if (!this.registration) {
        this.registration = await this.registerServiceWorker();
      }

      // Check if already subscribed
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        return existingSubscription;
      }

      // Subscribe to push notifications
      const vapidKey = await this.getVapidPublicKey();
      if (!vapidKey) {
        console.warn('VAPID public key not configured');
        return null;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      });

      console.log('Push subscription successful:', subscription);

      // Save subscription to database
      await this.saveSubscription(subscription);

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
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
      console.log('Unsubscribed from push notifications:', result);

      return result;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
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
      console.error('Failed to check subscription status:', error);
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
      console.error('Failed to get subscription:', error);
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
        console.error('Failed to save subscription to database:', error);
        throw error;
      }

      console.log('Subscription saved to database');
    } catch (error) {
      console.error('Error saving subscription:', error);
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
        console.error('Failed to remove subscription from database:', error);
        throw error;
      }

      console.log('Subscription removed from database');
    } catch (error) {
      console.error('Error removing subscription:', error);
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
      console.log('Push notifications not supported in this browser');
      return false;
    }

    if (service.getPermission() === 'granted') {
      await service.subscribe();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
}
