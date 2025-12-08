// Enhanced error handling system with better UX and debugging
import { toast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';

export interface ErrorContext {
  action: string;
  component: string;
  userId?: string;
  additionalData?: Record<string, unknown>;
}

export interface DetailedError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'auth' | 'database' | 'validation' | 'system';
  retryable: boolean;
  context?: ErrorContext;
}

// Enhanced error mapping with better user messages
const ERROR_MAPPINGS: Record<string, Partial<DetailedError>> = {
  // Database errors
  'PGRST116': {
    message: 'No rows returned',
    userMessage: 'No data found',
    severity: 'low',
    category: 'database',
    retryable: false
  },
  'PGRST301': {
    message: 'Row level security violation',
    userMessage: 'Access denied. Please check your permissions.',
    severity: 'high',
    category: 'auth',
    retryable: false
  },
  '23505': {
    message: 'Unique constraint violation',
    userMessage: 'This record already exists',
    severity: 'medium',
    category: 'database',
    retryable: false
  },
  '23503': {
    message: 'Foreign key constraint violation',
    userMessage: 'Cannot complete action due to related data',
    severity: 'medium',
    category: 'database',
    retryable: false
  },
  
  // Auth errors
  'invalid_credentials': {
    message: 'Invalid login credentials',
    userMessage: 'Invalid email or password',
    severity: 'medium',
    category: 'auth',
    retryable: false
  },
  'email_not_confirmed': {
    message: 'Email not confirmed',
    userMessage: 'Please check your email and confirm your account',
    severity: 'medium',
    category: 'auth',
    retryable: false
  },
  'too_many_requests': {
    message: 'Rate limit exceeded',
    userMessage: 'Too many attempts. Please try again later.',
    severity: 'medium',
    category: 'auth',
    retryable: true
  },
  
  // Network errors
  'network_error': {
    message: 'Network connection failed',
    userMessage: 'Connection problem. Please check your internet.',
    severity: 'high',
    category: 'network',
    retryable: true
  },
  'timeout': {
    message: 'Request timeout',
    userMessage: 'Request timed out. Please try again.',
    severity: 'medium',
    category: 'network',
    retryable: true
  }
};

/**
 * Process and enhance error information
 */
export function processError(error: unknown, context?: ErrorContext): DetailedError {
  let processedError: DetailedError = {
    code: 'unknown_error',
    message: 'Unknown error occurred',
    userMessage: 'Something went wrong. Please try again.',
    severity: 'medium',
    category: 'system',
    retryable: true,
    context
  };

  // Handle different error types
  if (error instanceof Error) {
    processedError.message = error.message;
    
    // Check for specific error patterns
    const errorText = error.message.toLowerCase();
    
    if (errorText.includes('network') || errorText.includes('fetch')) {
      processedError = { ...processedError, ...ERROR_MAPPINGS.network_error };
    } else if (errorText.includes('timeout')) {
      processedError = { ...processedError, ...ERROR_MAPPINGS.timeout };
    }
  }
  
  // Handle Supabase errors
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as any;
    
    if (supabaseError.code) {
      const mapping = ERROR_MAPPINGS[supabaseError.code];
      if (mapping) {
        processedError = { ...processedError, ...mapping, code: supabaseError.code };
      }
    }
    
    if (supabaseError.message) {
      processedError.message = supabaseError.message;
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    processedError.message = error;
    const lowerError = error.toLowerCase();
    
    Object.entries(ERROR_MAPPINGS).forEach(([key, mapping]) => {
      if (lowerError.includes(key.toLowerCase())) {
        processedError = { ...processedError, ...mapping, code: key };
      }
    });
  }

  return processedError;
}

/**
 * Display error toast with enhanced messaging
 */
export function showEnhancedErrorToast(error: unknown, context?: ErrorContext): DetailedError {
  const processedError = processError(error, context);
  
  toast({
    variant: "destructive",
    title: getErrorTitle(processedError),
    description: processedError.userMessage,
    duration: getErrorDuration(processedError.severity),
  });
  
  // Log for debugging in development
  if (process.env.NODE_ENV === 'development') {
    logger.error('Enhanced Error:', {
      error: processedError,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  return processedError;
}

/**
 * Display success toast with consistent styling
 */
export function showEnhancedSuccessToast(
  message: string, 
  title?: string, 
  duration: number = 4000
): void {
  toast({
    title: title || "Success",
    description: message,
    duration,
    className: "bg-success-100 text-success-800 border-success-300"
  });
}

/**
 * Get appropriate error title based on category
 */
function getErrorTitle(error: DetailedError): string {
  switch (error.category) {
    case 'auth':
      return 'Authentication Error';
    case 'database':
      return 'Data Error';
    case 'network':
      return 'Connection Error';
    case 'validation':
      return 'Invalid Input';
    default:
      return error.severity === 'critical' ? 'Critical Error' : 'Error';
  }
}

/**
 * Get toast duration based on error severity
 */
function getErrorDuration(severity: DetailedError['severity']): number {
  switch (severity) {
    case 'low':
      return 3000;
    case 'medium':
      return 5000;
    case 'high':
      return 7000;
    case 'critical':
      return 10000;
    default:
      return 5000;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  context?: ErrorContext
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const processedError = processError(error, context);

      if (!processedError.retryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Debounced error handler to prevent spam
 */
const errorQueue = new Map<string, NodeJS.Timeout>();

export function debouncedErrorToast(
  error: unknown, 
  context?: ErrorContext, 
  debounceMs: number = 1000
): void {
  const key = `${context?.component || 'unknown'}-${context?.action || 'unknown'}`;
  
  // Clear existing timeout
  const existingTimeout = errorQueue.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  
  // Set new timeout
  const timeout = setTimeout(() => {
    showEnhancedErrorToast(error, context);
    errorQueue.delete(key);
  }, debounceMs);
  
  errorQueue.set(key, timeout);
}

/**
 * Safe async operation wrapper
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  showToast: boolean = true
): Promise<{ data: T | null; error: DetailedError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const processedError = processError(error, context);
    
    if (showToast) {
      showEnhancedErrorToast(error, context);
    }
    
    return { data: null, error: processedError };
  }
}

/**
 * Form validation error handler
 */
export function handleValidationErrors(
  errors: Record<string, string[]>,
  context?: ErrorContext
): void {
  const errorMessages = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('\n');
  
  toast({
    variant: "destructive",
    title: "Validation Error",
    description: errorMessages,
    duration: 5000,
  });
  
  if (process.env.NODE_ENV === 'development') {
    logger.error('Validation errors:', { errors, context });
  }
}

/**
 * Global error boundary handler
 */
export function handleGlobalError(error: Error, errorInfo: any): void {
  const context: ErrorContext = {
    action: 'global_error_boundary',
    component: 'ErrorBoundary',
    additionalData: { errorInfo }
  };
  
  const processedError = processError(error, context);

  logger.error('Global error caught:', {
    error: processedError,
    errorInfo,
    timestamp: new Date().toISOString()
  });
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToErrorTracking(processedError, errorInfo);
  }
}

// Export commonly used error types for consistency
export const COMMON_ERRORS = {
  NETWORK_ERROR: 'network_error',
  AUTH_REQUIRED: 'auth_required',
  PERMISSION_DENIED: 'permission_denied',
  VALIDATION_FAILED: 'validation_failed',
  NOT_FOUND: 'not_found',
  SERVER_ERROR: 'server_error'
} as const;