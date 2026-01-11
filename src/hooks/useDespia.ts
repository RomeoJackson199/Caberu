/**
 * React hooks for Despia Native Apple features
 *
 * Provides easy-to-use hooks for all native Apple features including
 * haptics, biometrics, notifications, in-app purchases, HealthKit, and more.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isDespiaNative,
  triggerHaptic,
  haptics,
  authenticateWithBiometrics,
  scheduleLocalNotification,
  cancelAllLocalNotifications,
  saveToVault,
  readFromVault,
  deleteFromVault,
  purchaseProduct,
  restorePurchases,
  checkSubscriptionStatus,
  readHealthKitData,
  writeHealthKitData,
  requestHealthKitAuth,
  takeScreenshot,
  saveImageToPhotos,
  openCamera,
  openPhotoLibrary,
  share,
  getAppVersion,
  getDeviceUUID,
  getSafeAreaInsets,
  pickContact,
  dismissKeyboard,
  type HapticType,
  type BiometricAuthResult,
  type LocalNotificationOptions,
  type PurchaseResult,
  type HealthKitData,
  type HealthKitQuantityType,
  type HealthKitCategoryType,
  type ShareOptions,
  type AppVersionInfo,
  type SafeAreaInsets,
  type Contact,
} from '@/lib/despia';

// Re-export types that components may need
export type { HapticType } from '@/lib/despia';

// ============================================
// CORE HOOK - Check if running in native context
// ============================================

export function useDespiaNative() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isDespiaNative());
  }, []);

  return isNative;
}

// ============================================
// HAPTIC FEEDBACK HOOK
// ============================================

export function useHaptics() {
  const isNative = useDespiaNative();

  const trigger = useCallback((type: HapticType) => {
    triggerHaptic(type);
  }, []);

  return {
    isAvailable: isNative || (typeof navigator !== 'undefined' && 'vibrate' in navigator),
    trigger,
    light: haptics.light,
    heavy: haptics.heavy,
    success: haptics.success,
    warning: haptics.warning,
    error: haptics.error,
    selection: haptics.selection,
    impact: haptics.impact,
    notification: haptics.notification,
  };
}

// ============================================
// BIOMETRIC AUTHENTICATION HOOK
// ============================================

export function useBiometricAuth() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lastResult, setLastResult] = useState<BiometricAuthResult | null>(null);
  const isNative = useDespiaNative();

  const authenticate = useCallback(async (): Promise<BiometricAuthResult> => {
    setIsAuthenticating(true);
    try {
      const result = await authenticateWithBiometrics();
      setLastResult(result);
      return result;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  return {
    isAvailable: isNative,
    isAuthenticating,
    lastResult,
    authenticate,
  };
}

// ============================================
// LOCAL NOTIFICATIONS HOOK
// ============================================

export function useLocalNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const isNative = useDespiaNative();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return permission === 'granted';
  }, [permission]);

  const schedule = useCallback(async (options: LocalNotificationOptions): Promise<boolean> => {
    return scheduleLocalNotification(options);
  }, []);

  const cancelAll = useCallback(() => {
    cancelAllLocalNotifications();
  }, []);

  return {
    isAvailable: isNative || 'Notification' in window,
    permission,
    requestPermission,
    schedule,
    cancelAll,
  };
}

// ============================================
// STORAGE VAULT HOOK (iCloud sync)
// ============================================

export function useStorageVault<T = string>(key: string, defaultValue?: T) {
  const [value, setValue] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial value
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const stored = await readFromVault(key);
        if (mounted) {
          if (stored !== null) {
            try {
              setValue(JSON.parse(stored) as T);
            } catch {
              setValue(stored as unknown as T);
            }
          } else if (defaultValue !== undefined) {
            setValue(defaultValue);
          }
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load from vault');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [key, defaultValue]);

  const save = useCallback(async (newValue: T, locked = false): Promise<boolean> => {
    try {
      const stringValue = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
      const success = await saveToVault(key, stringValue, locked);
      if (success) {
        setValue(newValue);
        setError(null);
      }
      return success;
    } catch (err) {
      setError('Failed to save to vault');
      return false;
    }
  }, [key]);

  const remove = useCallback(async (): Promise<boolean> => {
    try {
      const success = await deleteFromVault(key);
      if (success) {
        setValue(null);
        setError(null);
      }
      return success;
    } catch (err) {
      setError('Failed to delete from vault');
      return false;
    }
  }, [key]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await readFromVault(key);
      if (stored !== null) {
        try {
          setValue(JSON.parse(stored) as T);
        } catch {
          setValue(stored as unknown as T);
        }
      }
      setError(null);
    } catch (err) {
      setError('Failed to refresh from vault');
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  return {
    value,
    isLoading,
    error,
    save,
    remove,
    refresh,
  };
}

// ============================================
// IN-APP PURCHASES HOOK
// ============================================

export interface UseInAppPurchasesOptions {
  userId: string;
  onPurchaseComplete?: (result: PurchaseResult) => void;
  onRestoreComplete?: (productIds: string[]) => void;
}

export function useInAppPurchases(options: UseInAppPurchasesOptions) {
  const { userId, onPurchaseComplete, onRestoreComplete } = options;
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<PurchaseResult | null>(null);
  const [restoredProducts, setRestoredProducts] = useState<string[]>([]);
  const isNative = useDespiaNative();

  const purchase = useCallback(async (productId: string): Promise<PurchaseResult> => {
    setIsPurchasing(true);
    try {
      const result = await purchaseProduct(productId, userId);
      setLastPurchase(result);
      onPurchaseComplete?.(result);
      return result;
    } finally {
      setIsPurchasing(false);
    }
  }, [userId, onPurchaseComplete]);

  const restore = useCallback(async (): Promise<string[]> => {
    setIsRestoring(true);
    try {
      const products = await restorePurchases();
      setRestoredProducts(products);
      onRestoreComplete?.(products);
      return products;
    } finally {
      setIsRestoring(false);
    }
  }, [onRestoreComplete]);

  const checkSubscription = useCallback(async (entitlementId: string): Promise<boolean> => {
    return checkSubscriptionStatus(entitlementId);
  }, []);

  return {
    isAvailable: isNative,
    isPurchasing,
    isRestoring,
    lastPurchase,
    restoredProducts,
    purchase,
    restore,
    checkSubscription,
  };
}

// ============================================
// HEALTHKIT HOOK
// ============================================

export interface UseHealthKitOptions {
  readTypes?: (HealthKitQuantityType | HealthKitCategoryType)[];
  writeTypes?: HealthKitQuantityType[];
  autoRequestAuth?: boolean;
}

export function useHealthKit(options: UseHealthKitOptions = {}) {
  const { readTypes = [], writeTypes = [], autoRequestAuth = false } = options;
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HealthKitData | null>(null);
  const isNative = useDespiaNative();

  // Auto-request authorization on mount if enabled
  useEffect(() => {
    if (autoRequestAuth && isNative && readTypes.length > 0) {
      requestHealthKitAuth(readTypes, writeTypes).then(setIsAuthorized);
    }
  }, [autoRequestAuth, isNative, readTypes.length, writeTypes.length]);

  const requestAuth = useCallback(async (): Promise<boolean> => {
    const authorized = await requestHealthKitAuth(readTypes, writeTypes);
    setIsAuthorized(authorized);
    return authorized;
  }, [readTypes, writeTypes]);

  const read = useCallback(async (
    types: (HealthKitQuantityType | HealthKitCategoryType)[],
    days: number
  ): Promise<HealthKitData | null> => {
    setIsLoading(true);
    try {
      const result = await readHealthKitData(types, days);
      setData(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const write = useCallback(async (
    type: HealthKitQuantityType,
    value: number,
    unit: string
  ): Promise<boolean> => {
    return writeHealthKitData(type, value, unit);
  }, []);

  return {
    isAvailable: isNative,
    isAuthorized,
    isLoading,
    data,
    requestAuth,
    read,
    write,
  };
}

// ============================================
// CAMERA & MEDIA HOOK
// ============================================

export function useNativeMedia() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const isNative = useDespiaNative();

  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    setIsCapturing(true);
    try {
      const result = await takeScreenshot();
      setLastCapture(result);
      return result;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const saveImage = useCallback(async (imageUrl: string): Promise<boolean> => {
    return saveImageToPhotos(imageUrl);
  }, []);

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    setIsCapturing(true);
    try {
      const result = await openCamera();
      setLastCapture(result);
      return result;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const pickPhoto = useCallback(async (): Promise<string | null> => {
    setIsCapturing(true);
    try {
      const result = await openPhotoLibrary();
      setLastCapture(result);
      return result;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  return {
    isAvailable: isNative,
    isCapturing,
    lastCapture,
    captureScreenshot,
    saveImage,
    capturePhoto,
    pickPhoto,
  };
}

// ============================================
// SHARE HOOK
// ============================================

export function useNativeShare() {
  const [isSharing, setIsSharing] = useState(false);
  const isNative = useDespiaNative();

  const shareContent = useCallback(async (options: ShareOptions): Promise<boolean> => {
    setIsSharing(true);
    try {
      return await share(options);
    } finally {
      setIsSharing(false);
    }
  }, []);

  const shareUrl = useCallback(async (url: string, title?: string): Promise<boolean> => {
    return shareContent({ url, title });
  }, [shareContent]);

  const shareText = useCallback(async (message: string): Promise<boolean> => {
    return shareContent({ message });
  }, [shareContent]);

  return {
    isAvailable: isNative || (typeof navigator !== 'undefined' && 'share' in navigator),
    isSharing,
    share: shareContent,
    shareUrl,
    shareText,
  };
}

// ============================================
// APP INFO HOOK
// ============================================

export function useAppInfo() {
  const [version, setVersion] = useState<AppVersionInfo | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isNative = useDespiaNative();

  useEffect(() => {
    let mounted = true;

    const loadInfo = async () => {
      if (!isNative) {
        setIsLoading(false);
        return;
      }

      try {
        const [versionInfo, uuid] = await Promise.all([
          getAppVersion(),
          getDeviceUUID(),
        ]);

        if (mounted) {
          setVersion(versionInfo);
          setDeviceId(uuid);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadInfo();

    return () => {
      mounted = false;
    };
  }, [isNative]);

  return {
    isNative,
    isLoading,
    version,
    deviceId,
  };
}

// ============================================
// SAFE AREA HOOK
// ============================================

export function useSafeArea() {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const updateInsets = () => {
      setInsets(getSafeAreaInsets());
    };

    updateInsets();

    // Update on orientation change
    window.addEventListener('resize', updateInsets);
    window.addEventListener('orientationchange', updateInsets);

    return () => {
      window.removeEventListener('resize', updateInsets);
      window.removeEventListener('orientationchange', updateInsets);
    };
  }, []);

  // CSS class helper for safe area padding
  const safeAreaClasses = {
    all: 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]',
    top: 'pt-[env(safe-area-inset-top)]',
    bottom: 'pb-[env(safe-area-inset-bottom)]',
    left: 'pl-[env(safe-area-inset-left)]',
    right: 'pr-[env(safe-area-inset-right)]',
    horizontal: 'pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]',
    vertical: 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
  };

  return {
    insets,
    classes: safeAreaClasses,
  };
}

// ============================================
// CONTACTS HOOK
// ============================================

export function useContacts() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const isNative = useDespiaNative();

  const pick = useCallback(async (): Promise<Contact | null> => {
    setIsPicking(true);
    try {
      const contact = await pickContact();
      setSelectedContact(contact);
      return contact;
    } finally {
      setIsPicking(false);
    }
  }, []);

  return {
    isAvailable: isNative,
    isPicking,
    selectedContact,
    pick,
  };
}

// ============================================
// KEYBOARD HOOK
// ============================================

export function useKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  const isNative = useDespiaNative();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => setIsVisible(true);
    const handleBlur = () => setIsVisible(false);

    // Track keyboard visibility via focus events
    document.addEventListener('focusin', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        handleFocus();
      }
    });
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const dismiss = useCallback(() => {
    dismissKeyboard();
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    dismiss,
  };
}

// ============================================
// COMBINED APPLE FEATURES HOOK
// ============================================

export function useAppleFeatures() {
  const isNative = useDespiaNative();
  const haptics = useHaptics();
  const biometrics = useBiometricAuth();
  const notifications = useLocalNotifications();
  const nativeShare = useNativeShare();
  const safeArea = useSafeArea();
  const appInfo = useAppInfo();

  return {
    isNative,
    haptics,
    biometrics,
    notifications,
    share: nativeShare,
    safeArea,
    appInfo,
  };
}

// Export all hooks
export default {
  useDespiaNative,
  useHaptics,
  useBiometricAuth,
  useLocalNotifications,
  useStorageVault,
  useInAppPurchases,
  useHealthKit,
  useNativeMedia,
  useNativeShare,
  useAppInfo,
  useSafeArea,
  useContacts,
  useKeyboard,
  useAppleFeatures,
};
