import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

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

export const handleDatabaseError = (error: unknown, context: string): ErrorInfo => {
  logger.error(`Database error in ${context}:`, error);

  // Type-safe error handling
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

export const showErrorToast = (errorInfo: ErrorInfo, context?: string) => {
  toast({
    title: "Error",
    description: errorInfo.userFriendly,
    variant: "destructive",
  });

  // Log detailed error for debugging
  logger.error(`Error in ${context || 'unknown context'}:`, {
    message: errorInfo.message,
    code: errorInfo.code,
    details: errorInfo.details
  });
};

export const showSuccessToast = (message: string, title?: string) => {
  toast({
    title: title || "Success",
    description: message,
    variant: "default",
  });
};

// Add interface for profile data
interface ProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  [key: string]: unknown;
}

// Add interface for appointment data
interface AppointmentData {
  reason?: string;
  appointment_date?: string;
  dentist_id?: string;
  [key: string]: unknown;
}

export const validateProfileData = (data: ProfileData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.first_name?.trim()) {
    errors.push('First name is required');
  }

  if (!data.last_name?.trim()) {
    errors.push('Last name is required');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.phone && !/^[+]?[1-9][\d]{0,15}$/.test(data.phone.replace(/\s/g, ''))) {
    errors.push('Invalid phone number format');
  }

  if (data.date_of_birth) {
    const birthDate = new Date(data.date_of_birth);
    const today = new Date();
    if (birthDate > today) {
      errors.push('Date of birth cannot be in the future');
    }
    if (today.getFullYear() - birthDate.getFullYear() > 120) {
      errors.push('Invalid date of birth');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateAppointmentData = (data: AppointmentData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.reason?.trim()) {
    errors.push('Appointment reason is required');
  }

  if (!data.appointment_date) {
    errors.push('Appointment date is required');
  } else {
    const appointmentDate = new Date(data.appointment_date);
    const now = new Date();
    if (appointmentDate < now) {
      errors.push('Appointment date cannot be in the past');
    }
  }

  if (!data.dentist_id) {
    errors.push('Dentist selection is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const formatErrorForUser = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  // Type-safe error formatting
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
  return isNetworkError(error) || 
         errorObj?.code?.includes('TEMPORARY') ||
         errorObj?.code?.includes('TIMEOUT');
};