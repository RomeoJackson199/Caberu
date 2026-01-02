// Re-export from consolidated error-handling library
export {
  processError,
  showErrorToast,
  showSuccessToast,
  retryWithBackoff,
  debouncedErrorToast,
  safeAsyncOperation,
  handleValidationErrors,
  handleGlobalError,
  COMMON_ERRORS,
  showEnhancedErrorToast,
  showEnhancedSuccessToast,
} from './error-handling/notifications';

export type { ErrorContext, DetailedError } from './error-handling/notifications';
