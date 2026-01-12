import { useCallback, useRef } from 'react';

export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'impact'
  | 'notification'
  | 'rigid'
  | 'soft';

interface HapticFeedbackConfig {
  pattern: number | number[];
  enabled: boolean;
}

const hapticPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10, 50, 20],
  warning: [20, 30, 20],
  error: [30, 50, 30, 50, 30],
  selection: 5,
  impact: 15,
  notification: [10, 30, 10],
  rigid: 40,
  soft: 8,
};

export const useHaptics = () => {
  const isEnabledRef = useRef(true);
  const lastHapticTimeRef = useRef(0);
  const minInterval = 50; // Minimum time between haptic feedback to prevent overwhelming

  const isSupported = useCallback(() => {
    return 'vibrate' in navigator;
  }, []);

  const canVibrate = useCallback(() => {
    if (!isSupported() || !isEnabledRef.current) return false;

    const now = Date.now();
    if (now - lastHapticTimeRef.current < minInterval) return false;

    return true;
  }, [isSupported]);

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!canVibrate()) return false;

      try {
        lastHapticTimeRef.current = Date.now();
        return navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
        return false;
      }
    },
    [canVibrate]
  );

  const trigger = useCallback(
    (pattern: HapticPattern = 'light') => {
      const hapticPattern = hapticPatterns[pattern];
      return vibrate(hapticPattern);
    },
    [vibrate]
  );

  const cancel = useCallback(() => {
    if (!isSupported()) return false;

    try {
      return navigator.vibrate(0);
    } catch (error) {
      console.warn('Failed to cancel haptic feedback:', error);
      return false;
    }
  }, [isSupported]);

  const enable = useCallback(() => {
    isEnabledRef.current = true;
  }, []);

  const disable = useCallback(() => {
    isEnabledRef.current = false;
    cancel();
  }, [cancel]);

  const toggle = useCallback(() => {
    if (isEnabledRef.current) {
      disable();
    } else {
      enable();
    }
    return isEnabledRef.current;
  }, [enable, disable]);

  // iOS-style haptic patterns
  const impactLight = useCallback(() => trigger('light'), [trigger]);
  const impactMedium = useCallback(() => trigger('medium'), [trigger]);
  const impactHeavy = useCallback(() => trigger('heavy'), [trigger]);
  const impactRigid = useCallback(() => trigger('rigid'), [trigger]);
  const impactSoft = useCallback(() => trigger('soft'), [trigger]);

  const notificationSuccess = useCallback(() => trigger('success'), [trigger]);
  const notificationWarning = useCallback(() => trigger('warning'), [trigger]);
  const notificationError = useCallback(() => trigger('error'), [trigger]);

  const selectionChanged = useCallback(() => trigger('selection'), [trigger]);

  return {
    // Core functions
    trigger,
    vibrate,
    cancel,
    enable,
    disable,
    toggle,
    isSupported,
    isEnabled: isEnabledRef.current,

    // iOS-style haptic generators
    impact: {
      light: impactLight,
      medium: impactMedium,
      heavy: impactHeavy,
      rigid: impactRigid,
      soft: impactSoft,
    },
    notification: {
      success: notificationSuccess,
      warning: notificationWarning,
      error: notificationError,
    },
    selection: selectionChanged,
  };
};

export default useHaptics;
