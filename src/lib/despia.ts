/**
 * Despia Native Service
 *
 * Provides access to native Apple/iOS features through the despia-native SDK.
 * Features include: Haptics, Biometrics, Push Notifications, In-App Purchases,
 * Storage Vault (iCloud), HealthKit, Camera, Share, and more.
 */
import despia from 'despia-native';

// Type definitions for despia responses
export interface DespiaResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AppVersionInfo {
  versionNumber: string;
  bundleNumber: string;
}

export interface PurchaseResult {
  productId: string;
  transactionId: string;
  status: 'success' | 'cancelled' | 'failed';
}

export interface HealthKitData {
  [key: string]: Array<{
    value: number;
    date: string;
    unit: string;
  }>;
}

export interface StorageVaultItem {
  key: string;
  value: string;
  locked: boolean;
}

// Check if running in Despia Native context
export function isDespiaNative(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).despia || !!(window as any).DespiaRuntime;
}

// ============================================
// HAPTIC FEEDBACK
// ============================================

export type HapticType = 'light' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 */
export function triggerHaptic(type: HapticType): void {
  if (!isDespiaNative()) {
    // Fallback to web vibration API if available
    if (navigator.vibrate) {
      const patterns: Record<HapticType, number[]> = {
        light: [10],
        heavy: [40],
        success: [10, 50, 10, 50, 30],
        warning: [30, 100, 30],
        error: [50, 100, 50, 100, 50],
      };
      navigator.vibrate(patterns[type]);
    }
    return;
  }

  const hapticCommands: Record<HapticType, string> = {
    light: 'lighthaptic://',
    heavy: 'heavyhaptic://',
    success: 'successhaptic://',
    warning: 'warninghaptic://',
    error: 'errorhaptic://',
  };

  despia(hapticCommands[type]);
}

// Convenience haptic methods
export const haptics = {
  light: () => triggerHaptic('light'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  /** Selection feedback - very light tap */
  selection: () => triggerHaptic('light'),
  /** Impact feedback for button presses */
  impact: () => triggerHaptic('heavy'),
  /** Notification feedback */
  notification: (type: 'success' | 'warning' | 'error') => triggerHaptic(type),
};

// ============================================
// BIOMETRIC AUTHENTICATION (Face ID / Touch ID)
// ============================================

export interface BiometricAuthResult {
  authenticated: boolean;
  biometryType?: 'faceId' | 'touchId' | 'fingerprint';
  error?: string;
}

/**
 * Authenticate using Face ID, Touch ID, or fingerprint
 * @returns Promise resolving to authentication result
 */
export async function authenticateWithBiometrics(): Promise<BiometricAuthResult> {
  if (!isDespiaNative()) {
    // Check for WebAuthn as fallback
    if (window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) {
          return { authenticated: false, error: 'Biometrics not available' };
        }
        // For web, we'd need to implement full WebAuthn flow
        return { authenticated: false, error: 'Use native app for biometric auth' };
      } catch {
        return { authenticated: false, error: 'Biometrics check failed' };
      }
    }
    return { authenticated: false, error: 'Biometrics not supported' };
  }

  return new Promise((resolve) => {
    // Set up global callback for biometric result
    (window as any).bioAuthSuccess = () => {
      resolve({ authenticated: true, biometryType: 'faceId' });
    };
    (window as any).bioAuthFailure = (error?: string) => {
      resolve({ authenticated: false, error: error || 'Authentication failed' });
    };

    despia('bioauth://');
  });
}

// ============================================
// LOCAL PUSH NOTIFICATIONS
// ============================================

export interface LocalNotificationOptions {
  title: string;
  body: string;
  /** Delay in seconds before showing notification */
  delaySeconds?: number;
  /** Badge number to show on app icon */
  badge?: number;
  /** Sound to play (default, none, or custom) */
  sound?: 'default' | 'none' | string;
  /** Custom data to attach to notification */
  data?: Record<string, unknown>;
}

/**
 * Schedule a local push notification
 * @param options - Notification options
 */
export async function scheduleLocalNotification(options: LocalNotificationOptions): Promise<boolean> {
  const { title, body, delaySeconds = 0, badge, sound = 'default' } = options;

  if (!isDespiaNative()) {
    // Fallback to Web Notifications API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        if (delaySeconds > 0) {
          setTimeout(() => {
            new Notification(title, { body, badge: '/favicon.ico' });
          }, delaySeconds * 1000);
        } else {
          new Notification(title, { body, badge: '/favicon.ico' });
        }
        return true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
          return true;
        }
      }
    }
    return false;
  }

  const params = new URLSearchParams({
    title,
    body,
    delay: delaySeconds.toString(),
    ...(badge !== undefined && { badge: badge.toString() }),
    ...(sound && { sound }),
  });

  despia(`localpush://?${params.toString()}`);
  return true;
}

/**
 * Cancel all pending local notifications
 */
export function cancelAllLocalNotifications(): void {
  if (isDespiaNative()) {
    despia('cancellocalnotifications://');
  }
}

// ============================================
// STORAGE VAULT (iCloud Key-Value Storage)
// ============================================

/**
 * Save data to Storage Vault (syncs with iCloud on iOS)
 * @param key - Storage key
 * @param value - Value to store
 * @param locked - If true, requires biometric auth to access
 */
export async function saveToVault(key: string, value: string, locked = false): Promise<boolean> {
  if (!isDespiaNative()) {
    // Fallback to localStorage
    try {
      localStorage.setItem(`vault_${key}`, JSON.stringify({ value, locked }));
      return true;
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    (window as any).vaultSaveSuccess = () => resolve(true);
    (window as any).vaultSaveFailure = () => resolve(false);

    const params = new URLSearchParams({
      key,
      value,
      locked: locked.toString(),
    });
    despia(`vault://save?${params.toString()}`);
  });
}

/**
 * Read data from Storage Vault
 * @param key - Storage key
 * @returns Value or null if not found
 */
export async function readFromVault(key: string): Promise<string | null> {
  if (!isDespiaNative()) {
    // Fallback to localStorage
    try {
      const item = localStorage.getItem(`vault_${key}`);
      if (item) {
        const parsed = JSON.parse(item);
        return parsed.value;
      }
      return null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    (window as any).vaultReadSuccess = (value: string) => resolve(value);
    (window as any).vaultReadFailure = () => resolve(null);

    despia(`vault://read?key=${encodeURIComponent(key)}`, ['vaultValue']);
  });
}

/**
 * Delete data from Storage Vault
 * @param key - Storage key to delete
 */
export async function deleteFromVault(key: string): Promise<boolean> {
  if (!isDespiaNative()) {
    try {
      localStorage.removeItem(`vault_${key}`);
      return true;
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    (window as any).vaultDeleteSuccess = () => resolve(true);
    (window as any).vaultDeleteFailure = () => resolve(false);

    despia(`vault://delete?key=${encodeURIComponent(key)}`);
  });
}

// ============================================
// IN-APP PURCHASES (RevenueCat)
// ============================================

export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
}

/**
 * Purchase a product or subscription via RevenueCat
 * @param productId - The RevenueCat product identifier
 * @param userId - The user's external ID for attribution
 */
export async function purchaseProduct(productId: string, userId: string): Promise<PurchaseResult> {
  if (!isDespiaNative()) {
    return {
      productId,
      transactionId: '',
      status: 'failed',
    };
  }

  return new Promise((resolve) => {
    // Set up global callback for purchase result
    (window as any).iapSuccess = (data: any) => {
      resolve({
        productId,
        transactionId: data?.transactionId || '',
        status: 'success',
      });
    };
    (window as any).iapFailure = (error?: string) => {
      resolve({
        productId,
        transactionId: '',
        status: error === 'cancelled' ? 'cancelled' : 'failed',
      });
    };

    const params = new URLSearchParams({
      external_id: userId,
      product: productId,
    });
    despia(`revenuecat://purchase?${params.toString()}`);
  });
}

/**
 * Restore previous purchases
 * @returns Array of restored product IDs
 */
export async function restorePurchases(): Promise<string[]> {
  if (!isDespiaNative()) {
    return [];
  }

  return new Promise((resolve) => {
    (window as any).restoreSuccess = (data: { products: string[] }) => {
      resolve(data?.products || []);
    };
    (window as any).restoreFailure = () => resolve([]);

    despia('getpurchasehistory://', ['restoredData']);
  });
}

/**
 * Check if user has active subscription
 * @param entitlementId - The entitlement ID to check
 */
export async function checkSubscriptionStatus(entitlementId: string): Promise<boolean> {
  if (!isDespiaNative()) {
    return false;
  }

  return new Promise((resolve) => {
    (window as any).subscriptionCheckSuccess = (data: { active: boolean }) => {
      resolve(data?.active || false);
    };
    (window as any).subscriptionCheckFailure = () => resolve(false);

    despia(`revenuecat://check?entitlement=${encodeURIComponent(entitlementId)}`, ['subscriptionStatus']);
  });
}

// ============================================
// HEALTHKIT INTEGRATION
// ============================================

export type HealthKitQuantityType =
  | 'HKQuantityTypeIdentifierStepCount'
  | 'HKQuantityTypeIdentifierHeartRate'
  | 'HKQuantityTypeIdentifierActiveEnergyBurned'
  | 'HKQuantityTypeIdentifierDistanceWalkingRunning'
  | 'HKQuantityTypeIdentifierFlightsClimbed'
  | 'HKQuantityTypeIdentifierBodyMass'
  | 'HKQuantityTypeIdentifierHeight'
  | 'HKQuantityTypeIdentifierBloodPressureSystolic'
  | 'HKQuantityTypeIdentifierBloodPressureDiastolic'
  | 'HKQuantityTypeIdentifierBloodGlucose'
  | 'HKQuantityTypeIdentifierOxygenSaturation';

export type HealthKitCategoryType =
  | 'HKCategoryTypeIdentifierSleepAnalysis'
  | 'HKCategoryTypeIdentifierMindfulSession';

/**
 * Read health data from HealthKit
 * @param types - Array of HealthKit type identifiers
 * @param days - Number of days of data to retrieve
 */
export async function readHealthKitData(
  types: (HealthKitQuantityType | HealthKitCategoryType)[],
  days: number
): Promise<HealthKitData | null> {
  if (!isDespiaNative()) {
    return null;
  }

  return new Promise((resolve) => {
    (window as any).healthkitResponse = (data: HealthKitData) => {
      resolve(data);
    };
    (window as any).healthkitError = () => resolve(null);

    const typesParam = types.join(',');
    despia(`healthkit://read?types=${encodeURIComponent(typesParam)}&days=${days}`, ['healthkitResponse']);
  });
}

/**
 * Write data to HealthKit
 * @param type - HealthKit quantity type
 * @param value - Numeric value to write
 * @param unit - Unit of measurement
 */
export async function writeHealthKitData(
  type: HealthKitQuantityType,
  value: number,
  unit: string
): Promise<boolean> {
  if (!isDespiaNative()) {
    return false;
  }

  return new Promise((resolve) => {
    (window as any).healthkitWriteSuccess = () => resolve(true);
    (window as any).healthkitWriteError = () => resolve(false);

    const params = new URLSearchParams({
      type,
      value: value.toString(),
      unit,
    });
    despia(`healthkit://write?${params.toString()}`);
  });
}

/**
 * Request HealthKit authorization for specific types
 * @param readTypes - Types to request read access for
 * @param writeTypes - Types to request write access for
 */
export async function requestHealthKitAuth(
  readTypes: (HealthKitQuantityType | HealthKitCategoryType)[],
  writeTypes: HealthKitQuantityType[] = []
): Promise<boolean> {
  if (!isDespiaNative()) {
    return false;
  }

  return new Promise((resolve) => {
    (window as any).healthkitAuthSuccess = () => resolve(true);
    (window as any).healthkitAuthError = () => resolve(false);

    const params = new URLSearchParams({
      read: readTypes.join(','),
      write: writeTypes.join(','),
    });
    despia(`healthkit://auth?${params.toString()}`);
  });
}

// ============================================
// CAMERA & MEDIA
// ============================================

/**
 * Take a screenshot and get the image data
 */
export async function takeScreenshot(): Promise<string | null> {
  if (!isDespiaNative()) {
    return null;
  }

  return new Promise((resolve) => {
    (window as any).screenshotSuccess = (base64: string) => resolve(base64);
    (window as any).screenshotFailure = () => resolve(null);

    despia('takescreenshot://');
  });
}

/**
 * Save an image to the device's photo library
 * @param imageUrl - URL of the image to save
 */
export async function saveImageToPhotos(imageUrl: string): Promise<boolean> {
  if (!isDespiaNative()) {
    // Fallback: open image in new tab for manual save
    window.open(imageUrl, '_blank');
    return false;
  }

  return new Promise((resolve) => {
    (window as any).saveImageSuccess = () => resolve(true);
    (window as any).saveImageFailure = () => resolve(false);

    despia(`savethisimage://?url=${encodeURIComponent(imageUrl)}`);
  });
}

/**
 * Open native camera to capture photo
 */
export async function openCamera(): Promise<string | null> {
  if (!isDespiaNative()) {
    return null;
  }

  return new Promise((resolve) => {
    (window as any).cameraSuccess = (base64: string) => resolve(base64);
    (window as any).cameraFailure = () => resolve(null);

    despia('camera://capture');
  });
}

/**
 * Open photo library picker
 */
export async function openPhotoLibrary(): Promise<string | null> {
  if (!isDespiaNative()) {
    return null;
  }

  return new Promise((resolve) => {
    (window as any).photoPickerSuccess = (base64: string) => resolve(base64);
    (window as any).photoPickerFailure = () => resolve(null);

    despia('photolibrary://pick');
  });
}

// ============================================
// SHARE & SOCIAL
// ============================================

export interface ShareOptions {
  message?: string;
  url?: string;
  title?: string;
  image?: string;
}

/**
 * Open native share sheet
 * @param options - Share content options
 */
export async function share(options: ShareOptions): Promise<boolean> {
  const { message, url, title, image } = options;

  if (!isDespiaNative()) {
    // Fallback to Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: message,
          url,
        });
        return true;
      } catch {
        return false;
      }
    }
    // Fallback to clipboard
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  const params = new URLSearchParams();
  if (message) params.append('message', message);
  if (url) params.append('url', url);
  if (title) params.append('title', title);
  if (image) params.append('image', image);

  despia(`shareapp://?${params.toString()}`);
  return true;
}

// ============================================
// APP INFO & UTILITIES
// ============================================

/**
 * Get app version information
 */
export async function getAppVersion(): Promise<AppVersionInfo | null> {
  if (!isDespiaNative()) {
    return null;
  }

  return new Promise((resolve) => {
    (window as any).versionCallback = (version: string, bundle: string) => {
      resolve({ versionNumber: version, bundleNumber: bundle });
    };

    despia('getappversion://', ['versionNumber', 'bundleNumber']);
  });
}

/**
 * Get unique device identifier
 */
export async function getDeviceUUID(): Promise<string | null> {
  if (!isDespiaNative()) {
    return null;
  }

  return new Promise((resolve) => {
    (window as any).uuidCallback = (uuid: string) => resolve(uuid);

    despia('get-uuid://', ['uuid']);
  });
}

/**
 * Show native loading spinner
 */
export function showSpinner(): void {
  if (isDespiaNative()) {
    despia('spinneron://');
  }
}

/**
 * Hide native loading spinner
 */
export function hideSpinner(): void {
  if (isDespiaNative()) {
    despia('spinneroff://');
  }
}

/**
 * Hide status bar (for fullscreen experiences)
 */
export function hideStatusBar(): void {
  if (isDespiaNative()) {
    despia('hidebars://on');
  }
}

/**
 * Show status bar
 */
export function showStatusBar(): void {
  if (isDespiaNative()) {
    despia('hidebars://off');
  }
}

/**
 * Open app settings
 */
export function openAppSettings(): void {
  if (isDespiaNative()) {
    despia('opensettings://');
  }
}

/**
 * Open URL in external browser
 * @param url - URL to open
 */
export function openExternalURL(url: string): void {
  if (isDespiaNative()) {
    despia(`openurl://?url=${encodeURIComponent(url)}`);
  } else {
    window.open(url, '_blank');
  }
}

// ============================================
// SAFE AREA HANDLING
// ============================================

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Get safe area insets for notch/home indicator
 * CSS variables are automatically set: --sat, --sab, --sal, --sar
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);

  return {
    top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
    bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
    left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
    right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
  };
}

/**
 * Apply safe area padding to an element
 * @param element - DOM element to apply padding to
 */
export function applySafeAreaPadding(element: HTMLElement): void {
  element.style.paddingTop = 'env(safe-area-inset-top)';
  element.style.paddingBottom = 'env(safe-area-inset-bottom)';
  element.style.paddingLeft = 'env(safe-area-inset-left)';
  element.style.paddingRight = 'env(safe-area-inset-right)';
}

// ============================================
// CONTACTS ACCESS
// ============================================

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

/**
 * Pick a contact from the device's contact list
 */
export async function pickContact(): Promise<Contact | null> {
  if (!isDespiaNative()) {
    return null;
  }

  return new Promise((resolve) => {
    (window as any).contactPickerSuccess = (contact: Contact) => resolve(contact);
    (window as any).contactPickerFailure = () => resolve(null);

    despia('contacts://pick');
  });
}

// ============================================
// KEYBOARD MANAGEMENT
// ============================================

/**
 * Dismiss the native keyboard
 */
export function dismissKeyboard(): void {
  if (isDespiaNative()) {
    despia('keyboard://dismiss');
  } else {
    // Web fallback: blur active element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
}

// ============================================
// EXPORT DEFAULT DESPIA SERVICE OBJECT
// ============================================

export const despiaService = {
  // Core
  isNative: isDespiaNative,

  // Haptics
  haptics,
  triggerHaptic,

  // Biometrics
  authenticateWithBiometrics,

  // Notifications
  scheduleLocalNotification,
  cancelAllLocalNotifications,

  // Storage
  vault: {
    save: saveToVault,
    read: readFromVault,
    delete: deleteFromVault,
  },

  // Purchases
  iap: {
    purchase: purchaseProduct,
    restore: restorePurchases,
    checkSubscription: checkSubscriptionStatus,
  },

  // HealthKit
  healthKit: {
    read: readHealthKitData,
    write: writeHealthKitData,
    requestAuth: requestHealthKitAuth,
  },

  // Camera & Media
  media: {
    takeScreenshot,
    saveImageToPhotos,
    openCamera,
    openPhotoLibrary,
  },

  // Share
  share,

  // App utilities
  getAppVersion,
  getDeviceUUID,
  showSpinner,
  hideSpinner,
  hideStatusBar,
  showStatusBar,
  openAppSettings,
  openExternalURL,

  // Safe area
  getSafeAreaInsets,
  applySafeAreaPadding,

  // Contacts
  pickContact,

  // Keyboard
  dismissKeyboard,
};

export default despiaService;
