/**
 * Despia Native Service
 *
 * Provides access to native Apple/iOS features through the despia-native SDK.
 * Features include: Haptics, Biometrics, Push Notifications, In-App Purchases,
 * Storage Vault (iCloud), HealthKit, Camera, Share, and more.
 */
import despia from 'despia-native';

const DEFAULT_NATIVE_TIMEOUT_MS = 15000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface NativeRequestHandlers {
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}

const callbackRegistry = new Map<string, NativeRequestHandlers>();
const pendingOperationRequests = new Map<string, string[]>();
const installedGlobalCallbacks = new Set<string>();

function generateRequestId(operationKey: string): string {
  return `${operationKey}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function removePendingOperationRequest(operationKey: string, requestId: string): void {
  const pending = pendingOperationRequests.get(operationKey);
  if (!pending) return;

  const nextPending = pending.filter((id) => id !== requestId);
  if (nextPending.length === 0) {
    pendingOperationRequests.delete(operationKey);
    return;
  }
  pendingOperationRequests.set(operationKey, nextPending);
}

function createNativeRequest<T>(
  operationKey: string,
  timeoutMs = DEFAULT_NATIVE_TIMEOUT_MS
): {
  requestId: string;
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error?: unknown) => void;
} {
  const requestId = generateRequestId(operationKey);
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    callbackRegistry.delete(requestId);
    removePendingOperationRequest(operationKey, requestId);
  };

  const resolve = (value: T) => {
    if (settled) return;
    settled = true;
    cleanup();
    resolvePromise(value);
  };

  const reject = (error?: unknown) => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectPromise(error);
  };

  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolvePromise = resolveFn;
    rejectPromise = rejectFn;
  });

  timeoutId = setTimeout(() => {
    reject(new Error(`${operationKey} timed out`));
  }, timeoutMs);

  callbackRegistry.set(requestId, { resolve, reject });

  const pending = pendingOperationRequests.get(operationKey) || [];
  pending.push(requestId);
  pendingOperationRequests.set(operationKey, pending);

  return { requestId, promise, resolve, reject };
}

function extractRequestId(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const requestId = (value as { requestId?: unknown }).requestId;
  return typeof requestId === 'string' ? requestId : undefined;
}

function getNextPendingRequestId(operationKey: string): string | undefined {
  return pendingOperationRequests.get(operationKey)?.[0];
}

function resolveNativeRequest(operationKey: string, payload?: unknown): void {
  const requestId = extractRequestId(payload) || getNextPendingRequestId(operationKey);
  if (!requestId) return;
  callbackRegistry.get(requestId)?.resolve(payload);
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerGlobalCallback(name: string, handler: (...args: any[]) => void): void {
  if (typeof window === 'undefined' || installedGlobalCallbacks.has(name)) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((window as unknown) as Record<string, unknown>)[name] = (...args: any[]) => handler(...args);
  installedGlobalCallbacks.add(name);
}

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
  const nativeWindow = (window as unknown) as Record<string, unknown>;
  return !!nativeWindow.despia || !!nativeWindow.DespiaRuntime;
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
          return { authenticated: false, error: 'Biometrics not available on this device' };
        }

        // Implement WebAuthn authentication
        return await authenticateWithWebAuthn();
      } catch (error) {
        return {
          authenticated: false,
          error: error instanceof Error ? error.message : 'Biometrics check failed'
        };
      }
    }
    return { authenticated: false, error: 'Biometrics not supported on this browser' };
  }

  registerGlobalCallback('bioAuthSuccess', () => {
    resolveNativeRequest('biometric', { authenticated: true, biometryType: 'faceId' });
  });
  registerGlobalCallback('bioAuthFailure', (error?: string | { error?: string; requestId?: string }) => {
    resolveNativeRequest('biometric', {
      authenticated: false,
      error: typeof error === 'string' ? error : error?.error || 'Authentication failed',
      requestId: typeof error === 'object' ? error?.requestId : undefined,
    });
  });

  const { requestId, promise } = createNativeRequest<BiometricAuthResult>('biometric');
  despia(`bioauth://?requestId=${encodeURIComponent(requestId)}`);

  return promise.catch(() => ({
    authenticated: false,
    error: 'Authentication failed',
  }));
}

/**
 * WebAuthn authentication for web browsers
 * Provides biometric authentication fallback using platform authenticators
 */
async function authenticateWithWebAuthn(): Promise<BiometricAuthResult> {
  const credentialStorageKey = 'webauthn_credential_id';
  const storedCredentialId = localStorage.getItem(credentialStorageKey);

  try {
    // If no credential exists, register a new one
    if (!storedCredentialId) {
      return await registerWebAuthnCredential(credentialStorageKey);
    }

    // Authenticate with existing credential
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: base64ToArrayBuffer(storedCredentialId),
        type: 'public-key',
        transports: ['internal'],
      }],
      timeout: 60000,
      userVerification: 'required',
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential | null;

    if (credential) {
      return {
        authenticated: true,
        biometryType: 'fingerprint', // WebAuthn uses platform authenticator
      };
    }

    return { authenticated: false, error: 'Authentication cancelled' };
  } catch (error) {
    // If authentication fails, try to re-register
    if (error instanceof Error && error.name === 'NotAllowedError') {
      return { authenticated: false, error: 'Authentication cancelled by user' };
    }

    // Re-register if credential is invalid
    localStorage.removeItem(credentialStorageKey);
    return await registerWebAuthnCredential(credentialStorageKey);
  }
}

/**
 * Register a new WebAuthn credential
 */
async function registerWebAuthnCredential(storageKey: string): Promise<BiometricAuthResult> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Caberu',
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: 'user@caberu.app',
        displayName: 'Caberu User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential | null;

    if (credential) {
      // Store credential ID for future authentication
      const credentialId = arrayBufferToBase64(credential.rawId);
      localStorage.setItem(storageKey, credentialId);

      return {
        authenticated: true,
        biometryType: 'fingerprint',
      };
    }

    return { authenticated: false, error: 'Failed to create credential' };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      return { authenticated: false, error: 'Registration cancelled by user' };
    }
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

/**
 * Helper: Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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

const webLocalNotificationTimeoutIds = new Set<number>();

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
          const timeoutId = window.setTimeout(() => {
            webLocalNotificationTimeoutIds.delete(timeoutId);
            new Notification(title, { body, badge: '/favicon.ico' });
          }, delaySeconds * 1000);
          webLocalNotificationTimeoutIds.add(timeoutId);
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
  webLocalNotificationTimeoutIds.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  webLocalNotificationTimeoutIds.clear();

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

  registerGlobalCallback('vaultSaveSuccess', (payload?: { requestId?: string }) => {
    resolveNativeRequest('vault_save', { success: true, requestId: payload?.requestId });
  });
  registerGlobalCallback('vaultSaveFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('vault_save', { success: false, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ success: boolean }>('vault_save');
  const params = new URLSearchParams({
    key,
    value,
    locked: locked.toString(),
    requestId,
  });
  despia(`vault://save?${params.toString()}`);

  return promise.then((result) => result.success).catch(() => false);
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

  registerGlobalCallback('vaultReadSuccess', (value: string | { value?: string; requestId?: string }) => {
    if (typeof value === 'string') {
      resolveNativeRequest('vault_read', { value });
      return;
    }
    resolveNativeRequest('vault_read', value ?? { value: null });
  });
  registerGlobalCallback('vaultReadFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('vault_read', { value: null, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ value?: string | null }>('vault_read');
  despia(`vault://read?key=${encodeURIComponent(key)}&requestId=${encodeURIComponent(requestId)}`, ['vaultValue']);

  return promise.then((data) => data.value ?? null).catch(() => null);
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

  registerGlobalCallback('vaultDeleteSuccess', (payload?: { requestId?: string }) => {
    resolveNativeRequest('vault_delete', { success: true, requestId: payload?.requestId });
  });
  registerGlobalCallback('vaultDeleteFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('vault_delete', { success: false, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ success: boolean }>('vault_delete');
  despia(`vault://delete?key=${encodeURIComponent(key)}&requestId=${encodeURIComponent(requestId)}`);

  return promise.then((result) => result.success).catch(() => false);
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

  registerGlobalCallback('iapSuccess', (data?: { transactionId?: string; requestId?: string }) => {
    resolveNativeRequest('iap_purchase', data ?? {});
  });
  registerGlobalCallback('iapFailure', (error?: string | { error?: string; requestId?: string }) => {
    resolveNativeRequest('iap_purchase', {
      requestId: typeof error === 'object' ? error?.requestId : undefined,
      error: typeof error === 'string' ? error : error?.error,
    });
  });

  const { requestId, promise } = createNativeRequest<{ transactionId?: string; error?: string }>('iap_purchase');
  const params = new URLSearchParams({
    external_id: userId,
    product: productId,
    requestId,
  });
  despia(`revenuecat://purchase?${params.toString()}`);

  return promise
    .then((data) => {
      const status: PurchaseResult['status'] = data?.error === 'cancelled'
        ? 'cancelled'
        : data?.error
          ? 'failed'
          : 'success';
      return {
        productId,
        transactionId: data?.transactionId || '',
        status,
      };
    })
    .catch(() => ({
      productId,
      transactionId: '',
      status: 'failed',
    }));
}

/**
 * Restore previous purchases
 * @returns Array of restored product IDs
 */
export async function restorePurchases(): Promise<string[]> {
  if (!isDespiaNative()) {
    return [];
  }

  registerGlobalCallback('restoreSuccess', (data?: { products?: string[]; requestId?: string }) => {
    resolveNativeRequest('iap_restore', data ?? {});
  });
  registerGlobalCallback('restoreFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('iap_restore', { products: [], requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ products?: string[] }>('iap_restore');
  despia(`getpurchasehistory://?requestId=${encodeURIComponent(requestId)}`, ['restoredData']);

  return promise.then((data) => data?.products || []).catch(() => []);
}

/**
 * Check if user has active subscription
 * @param entitlementId - The entitlement ID to check
 */
export async function checkSubscriptionStatus(entitlementId: string): Promise<boolean> {
  if (!isDespiaNative()) {
    return false;
  }

  registerGlobalCallback('subscriptionCheckSuccess', (data?: { active?: boolean; requestId?: string }) => {
    resolveNativeRequest('iap_subscription_check', data ?? {});
  });
  registerGlobalCallback('subscriptionCheckFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('iap_subscription_check', { active: false, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ active?: boolean }>('iap_subscription_check');
  despia(`revenuecat://check?entitlement=${encodeURIComponent(entitlementId)}&requestId=${encodeURIComponent(requestId)}`, ['subscriptionStatus']);

  return promise.then((data) => data?.active || false).catch(() => false);
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

  registerGlobalCallback('healthkitResponse', (data?: (HealthKitData & { requestId?: string }) | null) => {
    resolveNativeRequest('healthkit_read', data ?? null);
  });
  registerGlobalCallback('healthkitError', (payload?: { requestId?: string }) => {
    resolveNativeRequest('healthkit_read', { requestId: payload?.requestId, value: null });
  });

  const { requestId, promise } = createNativeRequest<(HealthKitData & { value?: null }) | null>('healthkit_read');
  const typesParam = types.join(',');
  despia(`healthkit://read?types=${encodeURIComponent(typesParam)}&days=${days}&requestId=${encodeURIComponent(requestId)}`, ['healthkitResponse']);

  return promise.then((data) => (data && 'value' in data ? null : data)).catch(() => null);
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

  registerGlobalCallback('healthkitWriteSuccess', (payload?: { requestId?: string }) => {
    resolveNativeRequest('healthkit_write', { success: true, requestId: payload?.requestId });
  });
  registerGlobalCallback('healthkitWriteError', (payload?: { requestId?: string }) => {
    resolveNativeRequest('healthkit_write', { success: false, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ success: boolean }>('healthkit_write');
  const params = new URLSearchParams({
    type,
    value: value.toString(),
    unit,
    requestId,
  });
  despia(`healthkit://write?${params.toString()}`);

  return promise.then((data) => data.success).catch(() => false);
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

  registerGlobalCallback('healthkitAuthSuccess', (payload?: { requestId?: string }) => {
    resolveNativeRequest('healthkit_auth', { success: true, requestId: payload?.requestId });
  });
  registerGlobalCallback('healthkitAuthError', (payload?: { requestId?: string }) => {
    resolveNativeRequest('healthkit_auth', { success: false, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ success: boolean }>('healthkit_auth');
  const params = new URLSearchParams({
    read: readTypes.join(','),
    write: writeTypes.join(','),
    requestId,
  });
  despia(`healthkit://auth?${params.toString()}`);

  return promise.then((data) => data.success).catch(() => false);
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

  registerGlobalCallback('screenshotSuccess', (base64: string | { base64?: string; requestId?: string }) => {
    resolveNativeRequest('media_screenshot', typeof base64 === 'string' ? { base64 } : base64 ?? {});
  });
  registerGlobalCallback('screenshotFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('media_screenshot', { base64: null, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ base64?: string | null }>('media_screenshot');
  despia(`takescreenshot://?requestId=${encodeURIComponent(requestId)}`);

  return promise.then((data) => data.base64 ?? null).catch(() => null);
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

  registerGlobalCallback('saveImageSuccess', (payload?: { requestId?: string }) => {
    resolveNativeRequest('media_save_image', { success: true, requestId: payload?.requestId });
  });
  registerGlobalCallback('saveImageFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('media_save_image', { success: false, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ success: boolean }>('media_save_image');
  despia(`savethisimage://?url=${encodeURIComponent(imageUrl)}&requestId=${encodeURIComponent(requestId)}`);

  return promise.then((data) => data.success).catch(() => false);
}

/**
 * Open native camera to capture photo
 */
export async function openCamera(): Promise<string | null> {
  if (!isDespiaNative()) {
    return null;
  }

  registerGlobalCallback('cameraSuccess', (base64: string | { base64?: string; requestId?: string }) => {
    resolveNativeRequest('media_camera', typeof base64 === 'string' ? { base64 } : base64 ?? {});
  });
  registerGlobalCallback('cameraFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('media_camera', { base64: null, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ base64?: string | null }>('media_camera');
  despia(`camera://capture?requestId=${encodeURIComponent(requestId)}`);

  return promise.then((data) => data.base64 ?? null).catch(() => null);
}

/**
 * Open photo library picker
 */
export async function openPhotoLibrary(): Promise<string | null> {
  if (!isDespiaNative()) {
    return null;
  }

  registerGlobalCallback('photoPickerSuccess', (base64: string | { base64?: string; requestId?: string }) => {
    resolveNativeRequest('media_photo_library', typeof base64 === 'string' ? { base64 } : base64 ?? {});
  });
  registerGlobalCallback('photoPickerFailure', (payload?: { requestId?: string }) => {
    resolveNativeRequest('media_photo_library', { base64: null, requestId: payload?.requestId });
  });

  const { requestId, promise } = createNativeRequest<{ base64?: string | null }>('media_photo_library');
  despia(`photolibrary://pick?requestId=${encodeURIComponent(requestId)}`);

  return promise.then((data) => data.base64 ?? null).catch(() => null);
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
