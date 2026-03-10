import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseUnsavedChangesOptions {
  when: boolean;
  message?: string;
  onNavigate?: () => void;
  /** Enable session timeout warnings */
  enableTimeoutWarning?: boolean;
  /** Warning threshold in ms (default: 2 min before timeout) */
  warningThreshold?: number;
  /** Session timeout in ms (default: 15 min) */
  sessionTimeout?: number;
}

interface UseUnsavedChangesResult {
  isBlocked: boolean;
  proceed: () => void;
  reset: () => void;
  /** Time remaining until session timeout (ms) */
  timeRemaining: number | null;
  /** Whether user is in warning zone */
  isNearTimeout: boolean;
  /** Reset the session timer */
  resetTimer: () => void;
}

const DEFAULT_SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const DEFAULT_WARNING_THRESHOLD = 2 * 60 * 1000; // 2 minutes before timeout

/**
 * Hook to warn users before navigating away from a page with unsaved changes
 * Uses beforeunload event for browser navigation (refresh, close tab, etc.)
 * Also provides session timeout warnings when form has unsaved changes
 *
 * @example
 * ```tsx
 * const MyForm = () => {
 *   const [formData, setFormData] = useState({});
 *   const [hasChanges, setHasChanges] = useState(false);
 *
 *   const { isNearTimeout, timeRemaining } = useUnsavedChanges({
 *     when: hasChanges,
 *     enableTimeoutWarning: true,
 *     message: 'You have unsaved changes. Are you sure you want to leave?'
 *   });
 *
 *   // ... rest of component
 * };
 * ```
 */
export function useUnsavedChanges({
  when,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  onNavigate,
  enableTimeoutWarning = false,
  warningThreshold = DEFAULT_WARNING_THRESHOLD,
  sessionTimeout = DEFAULT_SESSION_TIMEOUT,
}: UseUnsavedChangesOptions): UseUnsavedChangesResult {
  const shouldBlockRef = useRef(when);
  const { toast } = useToast();
  
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isNearTimeout, setIsNearTimeout] = useState(false);
  
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset activity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setIsNearTimeout(false);
    setTimeRemaining(sessionTimeout);
  }, [sessionTimeout]);

  // Update ref whenever 'when' changes
  useEffect(() => {
    shouldBlockRef.current = when;
    if (when) {
      resetTimer();
    }
  }, [when, resetTimer]);

  // Handle browser navigation (refresh, close tab, etc.)
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldBlockRef.current) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when, message]);

  // Track time remaining and show warnings
  useEffect(() => {
    if (!when || !enableTimeoutWarning) {
      setTimeRemaining(null);
      setIsNearTimeout(false);
      return;
    }

    const checkTimer = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = sessionTimeout - elapsed;
      
      setTimeRemaining(remaining > 0 ? remaining : 0);
      setIsNearTimeout(remaining > 0 && remaining <= warningThreshold);

      // Show warning toast if near timeout with unsaved changes
      if (remaining <= warningThreshold && remaining > 0 && !warningShownRef.current) {
        warningShownRef.current = true;
        
        const minutes = Math.ceil(remaining / 60000);
        toast({
          title: 'Unsaved changes will be lost',
          description: `Your session will expire in ${minutes} minute${minutes > 1 ? 's' : ''}. Save your work now to avoid losing changes.`,
          variant: 'destructive',
          duration: 10000,
        });
      }
    };

    // Initial check
    checkTimer();

    // Check every 10 seconds
    timerRef.current = setInterval(checkTimer, 10000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [when, enableTimeoutWarning, sessionTimeout, warningThreshold, toast]);

  // Extend session on activity when form has changes
  useEffect(() => {
    if (!when || !enableTimeoutWarning) return;

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      resetTimer();
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [when, enableTimeoutWarning, resetTimer]);

  return {
    isBlocked: false,
    proceed: () => {},
    reset: () => {},
    timeRemaining,
    isNearTimeout,
    resetTimer,
  };
}

/**
 * Hook to track form changes and warn on navigation
 *
 * @example
 * ```tsx
 * const MyForm = () => {
 *   const form = useForm();
 *   const { isDirty } = form.formState;
 *
 *   useFormUnsavedChanges(isDirty);
 *
 *   // ... rest of component
 * };
 * ```
 */
export function useFormUnsavedChanges(isDirty: boolean) {
  return useUnsavedChanges({
    when: isDirty,
    message: 'You have unsaved form changes. Are you sure you want to leave?',
    enableTimeoutWarning: true, // Enable timeout warnings for forms with PHI
  });
}

/**
 * Utility to create a custom prompt component for unsaved changes
 * Can be used with the useUnsavedChanges hook for more control
 */
export function createUnsavedChangesPrompt(
  title: string = 'Unsaved Changes',
  description: string = 'You have unsaved changes that will be lost.'
) {
  return {
    title,
    description,
    confirmText: 'Leave',
    cancelText: 'Stay',
  };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(ms: number | null): string {
  if (ms === null) return '';
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
