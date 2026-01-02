/**
 * Error Handling Library
 * Consolidated error handling utilities
 */

// Error formatting and message extraction
export {
  type ErrorInfo,
  DashboardError,
  extractErrorMessage,
  formatErrorMessage,
  isErrorWithCode,
  getSupabaseErrorMessage,
  handleDatabaseError,
  formatErrorForUser,
  isNetworkError,
  isAuthError,
  shouldRetry,
  // Backward compatibility
  getUserFriendlyErrorMessage,
  getErrorMessage,
} from './formatting';

// Error notifications and toasts
export {
  type ErrorContext,
  type DetailedError,
  processError,
  showErrorToast,
  showSuccessToast,
  retryWithBackoff,
  debouncedErrorToast,
  safeAsyncOperation,
  handleValidationErrors,
  handleGlobalError,
  COMMON_ERRORS,
  // Backward compatibility
  showEnhancedErrorToast,
  showEnhancedSuccessToast,
} from './notifications';

// Error reporting
export {
  reportError,
  ErrorSeverity,
  type ErrorReport,
} from './reporting';
