import { useEffect, useRef } from 'react';

interface UseUnsavedChangesOptions {
  when: boolean;
  message?: string;
  onNavigate?: () => void;
}

/**
 * Hook to warn users before navigating away from a page with unsaved changes
 * Uses beforeunload event for browser navigation (refresh, close tab, etc.)
 *
 * @example
 * ```tsx
 * const MyForm = () => {
 *   const [formData, setFormData] = useState({});
 *   const [hasChanges, setHasChanges] = useState(false);
 *
 *   useUnsavedChanges({
 *     when: hasChanges,
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
  onNavigate
}: UseUnsavedChangesOptions) {
  const shouldBlockRef = useRef(when);

  // Update ref whenever 'when' changes
  useEffect(() => {
    shouldBlockRef.current = when;
  }, [when]);

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

  return {
    isBlocked: false,
    proceed: () => {},
    reset: () => {},
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
    message: 'You have unsaved form changes. Are you sure you want to leave?'
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
