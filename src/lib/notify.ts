import { toast } from "sonner";

// Standardized toast duration in milliseconds
const TOAST_DURATION = {
  short: 3000,
  default: 4000,
  long: 6000,
} as const;

interface NotifyOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Standardized notification utility
 * Use this for all toast notifications to ensure consistent styling and behavior
 */
export const notify = {
  /**
   * Success notification - use for completed actions
   */
  success: (message: string, options?: NotifyOptions) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? TOAST_DURATION.default,
      action: options?.action,
    });
  },

  /**
   * Error notification - use for failed actions or errors
   */
  error: (message: string, options?: NotifyOptions) => {
    toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? TOAST_DURATION.long,
      action: options?.action,
    });
  },

  /**
   * Info notification - use for neutral information
   */
  info: (message: string, options?: NotifyOptions) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration ?? TOAST_DURATION.default,
      action: options?.action,
    });
  },

  /**
   * Warning notification - use for important warnings
   */
  warning: (message: string, options?: NotifyOptions) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? TOAST_DURATION.long,
      action: options?.action,
    });
  },

  /**
   * Loading notification - returns a toast id for updating
   */
  loading: (message: string) => {
    return toast.loading(message);
  },

  /**
   * Dismiss a specific toast or all toasts
   */
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },

  /**
   * Promise-based notification - auto-updates based on promise state
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },

  /**
   * Action notification - use when user action is required
   * @deprecated Use success/info/warning with action option instead
   */
  action: (message: string, options: {
    description?: string;
    actionLabel: string;
    onAction: () => void;
  }) => {
    toast.info(message, {
      description: options.description,
      duration: TOAST_DURATION.long,
      action: {
        label: options.actionLabel,
        onClick: options.onAction
      }
    });
  },
};