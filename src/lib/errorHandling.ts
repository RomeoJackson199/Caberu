// Re-export from consolidated error-handling library
export {
  getUserFriendlyErrorMessage,
  getErrorMessage,
  extractErrorMessage,
  formatErrorMessage,
  isErrorWithCode,
  getSupabaseErrorMessage,
  handleDatabaseError,
  formatErrorForUser,
  isNetworkError,
  isAuthError,
  shouldRetry,
  DashboardError,
} from './error-handling/formatting';

export type { ErrorInfo } from './error-handling/formatting';
