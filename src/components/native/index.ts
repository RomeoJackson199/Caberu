/**
 * Native Apple Features Components
 *
 * Export all native feature components for easy importing.
 */

// Biometric Authentication
export { BiometricAuthButton } from './BiometricAuthButton';

// Haptic Feedback Buttons
export {
  HapticButton,
  SuccessButton,
  WarningButton,
  ErrorButton,
  ImpactButton,
} from './HapticButton';

// In-App Purchases
export {
  PurchaseButton,
  RestorePurchasesButton,
  SubscriptionCard,
  SubscriptionStatusBanner,
} from './InAppPurchase';

// HealthKit
export {
  HealthKitAuthCard,
  HealthMetricCard,
  HealthDashboard,
} from './HealthKitCard';

// Feature Showcase
export { NativeFeatures } from './NativeFeatures';

// Re-export hooks for convenience
export {
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
} from '@/hooks/useDespia';

// Re-export service for direct access
export { default as despiaService } from '@/lib/despia';
