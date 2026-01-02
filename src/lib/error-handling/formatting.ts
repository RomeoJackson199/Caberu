/**
 * Error formatting and type-safe error handling utilities.
 * Consolidated from errorHandling.ts and errorUtils.ts
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
  userFriendly?: string;
}

export class DashboardError extends Error {
  public code: string;
  public details: unknown;
  public userFriendly: string;

  constructor(message: string, code?: string, details?: unknown, userFriendly?: string) {
    super(message);
    this.name = 'DashboardError';
    this.code = code || 'UNKNOWN_ERROR';
    this.details = details;
    this.userFriendly = userFriendly || message;
  }
}

/**
 * Safely extracts error message from unknown error type.
 * Use in catch blocks instead of `error: any`.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}

/**
 * Get user-friendly error message with fallback support
 */
export const formatErrorMessage = (error: unknown, fallback?: string): string => {
  if (!error) return fallback || 'Something went wrong. Please try again.';

  if (typeof error === 'string') return error;

  if (error instanceof DashboardError) {
    return error.userFriendly || fallback || error.message;
  }

  if (error instanceof Error) {
    return error.message || fallback || 'An unexpected error occurred.';
  }

  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }

  return fallback || 'An unexpected error occurred. Please try again.';
};

/**
 * Type guard for checking if error has a specific property.
 */
export function isErrorWithCode(error: unknown): error is { code: string; message: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Maps common Supabase error codes to user-friendly messages.
 */
export function getSupabaseErrorMessage(error: unknown): string {
  if (!isErrorWithCode(error)) {
    return extractErrorMessage(error);
  }

  const errorMessages: Record<string, string> = {
    'PGRST116': 'Record not found',
    'PGRST301': 'Access denied',
    '23505': 'This record already exists',
    '23503': 'Cannot delete - this record is in use',
    '42501': 'Permission denied',
    'invalid_credentials': 'Invalid email or password',
    'email_not_confirmed': 'Please verify your email first',
  };

  return errorMessages[error.code] || error.message;
}

/**
 * Comprehensive database error handler with detailed error information
 */
export const handleDatabaseError = (error: unknown, context: string): ErrorInfo => {
  console.error(`Database error in ${context}:`, error);

  const err = error as { code?: string; message?: string; details?: string; hint?: string };

  // Handle specific Supabase errors
  if (err?.code) {
    switch (err.code) {
      case 'PGRST116':
        return {
          message: 'No rows returned',
          code: 'NO_DATA',
          details: err,
          userFriendly: 'No data found. Please try again later.'
        };
      case '23505':
        return {
          message: 'Duplicate key violation',
          code: 'DUPLICATE_KEY',
          details: err,
          userFriendly: 'This record already exists.'
        };
      case '23503':
        return {
          message: 'Foreign key violation',
          code: 'FOREIGN_KEY',
          details: err,
          userFriendly: 'Invalid reference. Please contact support.'
        };
      case '42P01':
        return {
          message: 'Table does not exist',
          code: 'TABLE_NOT_FOUND',
          details: err,
          userFriendly: 'System configuration error. Please contact support.'
        };
      case '42501':
        return {
          message: 'Insufficient privileges',
          code: 'PERMISSION_DENIED',
          details: err,
          userFriendly: 'You don\'t have permission to perform this action.'
        };
      default:
        return {
          message: err?.message || 'Unknown database error',
          code: err?.code || 'UNKNOWN_DB_ERROR',
          details: err,
          userFriendly: 'A database error occurred. Please try again.'
        };
    }
  }

  // Handle network errors
  if (err?.message?.includes('fetch')) {
    return {
      message: 'Network error',
      code: 'NETWORK_ERROR',
      details: err,
      userFriendly: 'Network connection error. Please check your internet connection.'
    };
  }

  // Handle authentication errors
  if (err?.message?.includes('JWT') || err?.message?.includes('auth')) {
    return {
      message: 'Authentication error',
      code: 'AUTH_ERROR',
      details: err,
      userFriendly: 'Authentication failed. Please log in again.'
    };
  }

  // Default error handling
  return {
    message: err?.message || 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
    details: err,
    userFriendly: 'An unexpected error occurred. Please try again.'
  };
};

export const formatErrorForUser = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  const err = error as { userFriendly?: string; message?: string };
  if (err?.userFriendly) {
    return err.userFriendly;
  }

  if (err?.message) {
    return err.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

export const isNetworkError = (error: unknown): boolean => {
  const errorObj = error as { message?: string; code?: string };
  return errorObj?.message?.includes('fetch') ||
         errorObj?.message?.includes('network') ||
         errorObj?.code === 'NETWORK_ERROR';
};

export const isAuthError = (error: unknown): boolean => {
  const errorObj = error as { message?: string; code?: string };
  return errorObj?.message?.includes('JWT') ||
         errorObj?.message?.includes('auth') ||
         errorObj?.code === 'AUTH_ERROR';
};

export const shouldRetry = (error: unknown): boolean => {
  const errorObj = error as { code?: string };
  // Don't retry auth errors or validation errors
  if (isAuthError(error) || errorObj?.code?.includes('VALIDATION')) {
    return false;
  }

  // Retry network errors and temporary database errors
  return Boolean(isNetworkError(error) ||
         errorObj?.code?.includes('TEMPORARY') ||
         errorObj?.code?.includes('TIMEOUT'));
};

// Backward compatibility aliases
export const getUserFriendlyErrorMessage = formatErrorMessage;
export const getErrorMessage = extractErrorMessage;
