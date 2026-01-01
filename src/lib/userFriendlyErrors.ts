/**
 * User-friendly error messages for common error scenarios
 * Provides actionable guidance instead of technical jargon
 */

export interface ErrorContext {
  operation?: string;
  entity?: string;
  userAction?: string;
}

export interface FriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  canRetry: boolean;
}

/**
 * Converts technical errors into user-friendly messages
 */
export function getFriendlyErrorMessage(
  error: Error | string,
  context?: ErrorContext
): FriendlyError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Network Errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return {
      title: 'Connection Issue',
      message: 'Unable to connect to the server. Please check your internet connection.',
      suggestion: 'Make sure you are connected to the internet and try again.',
      canRetry: true,
    };
  }

  // Timeout Errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete.',
      suggestion: 'This might be due to slow connection. Please try again.',
      canRetry: true,
    };
  }

  // Authentication Errors
  if (
    lowerMessage.includes('jwt') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('not authenticated') ||
    lowerMessage.includes('401')
  ) {
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      suggestion: 'Click below to return to the login page.',
      canRetry: false,
    };
  }

  // Permission Errors
  if (
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('permission denied') ||
    lowerMessage.includes('403')
  ) {
    return {
      title: 'Access Denied',
      message: "You don't have permission to perform this action.",
      suggestion: 'Contact your administrator if you believe this is an error.',
      canRetry: false,
    };
  }

  // Not Found Errors
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    const entity = context?.entity || 'resource';
    return {
      title: 'Not Found',
      message: `The ${entity} you're looking for could not be found.`,
      suggestion: 'It may have been deleted or moved. Please refresh and try again.',
      canRetry: true,
    };
  }

  // Conflict Errors (e.g., slot already booked)
  if (
    lowerMessage.includes('conflict') ||
    lowerMessage.includes('already exists') ||
    lowerMessage.includes('duplicate') ||
    lowerMessage.includes('409')
  ) {
    return {
      title: 'Already Taken',
      message: 'This time slot is no longer available.',
      suggestion: 'Please select a different time or refresh to see current availability.',
      canRetry: true,
    };
  }

  // Validation Errors
  if (
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('validation') ||
    lowerMessage.includes('required field') ||
    lowerMessage.includes('400')
  ) {
    return {
      title: 'Invalid Information',
      message: 'Some information is missing or incorrect.',
      suggestion: 'Please check all required fields and try again.',
      canRetry: true,
    };
  }

  // Rate Limiting
  if (
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('429')
  ) {
    return {
      title: 'Too Many Requests',
      message: "You've made too many requests. Please wait a moment.",
      suggestion: 'Try again in a few minutes.',
      canRetry: true,
    };
  }

  // Server Errors
  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('server error')
  ) {
    return {
      title: 'Server Error',
      message: "We're experiencing technical difficulties on our end.",
      suggestion: 'Please try again in a few moments. If the problem persists, contact support.',
      canRetry: true,
    };
  }

  // Database Errors
  if (lowerMessage.includes('pgrst') || lowerMessage.includes('postgrest')) {
    return {
      title: 'Database Error',
      message: 'We encountered a problem accessing your data.',
      suggestion: 'Please try again. If the problem continues, contact support.',
      canRetry: true,
    };
  }

  // Appointment-specific errors
  if (lowerMessage.includes('slot not available')) {
    return {
      title: 'Time Slot Unavailable',
      message: 'This appointment time is no longer available.',
      suggestion: 'Please select a different time slot or date.',
      canRetry: true,
    };
  }

  if (lowerMessage.includes('booking failed')) {
    return {
      title: 'Booking Failed',
      message: 'We were unable to complete your booking.',
      suggestion: 'Please check your information and try again.',
      canRetry: true,
    };
  }

  // Payment Errors
  if (lowerMessage.includes('payment')) {
    return {
      title: 'Payment Issue',
      message: 'There was a problem processing your payment.',
      suggestion: 'Please check your payment information and try again. No charges have been made.',
      canRetry: true,
    };
  }

  // Default fallback
  const operation = context?.operation || 'operation';
  return {
    title: 'Something Went Wrong',
    message: `We encountered an unexpected problem while ${operation}.`,
    suggestion: 'Please try again. If the problem persists, contact support for assistance.',
    canRetry: true,
  };
}

/**
 * Get a brief, user-friendly error summary (for toasts)
 */
export function getBriefErrorMessage(error: Error | string): string {
  const friendly = getFriendlyErrorMessage(error);
  return friendly.message;
}

/**
 * Get action text based on error recoverability
 */
export function getErrorActionText(error: Error | string): string {
  const friendly = getFriendlyErrorMessage(error);
  return friendly.canRetry ? 'Try Again' : 'Go Back';
}

/**
 * Determine if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: Error | string): boolean {
  const friendly = getFriendlyErrorMessage(error);
  return friendly.canRetry;
}
