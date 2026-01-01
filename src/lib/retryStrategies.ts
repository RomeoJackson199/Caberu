import { logger } from './logger';
import { toast } from '@/hooks/use-toast';

export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number; // milliseconds
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Executes an async operation with exponential backoff retry logic
 * Useful for network requests and other transient failures
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    shouldRetry = isRetriableError,
  } = config;

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (!shouldRetry(lastError)) {
        logger.warn(`Non-retriable error on attempt ${attempt}:`, lastError.message);
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        };
      }

      // If this was the last attempt, don't wait
      if (attempt >= maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );

      logger.info(`Retrying operation (attempt ${attempt}/${maxAttempts}) after ${delay}ms`);
      onRetry?.(attempt, lastError);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: attempt,
  };
}

/**
 * Determines if an error is retriable (network issues, timeouts, 5xx errors)
 */
export function isRetriableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('connection')
  ) {
    return true;
  }

  // Supabase specific errors
  if (message.includes('pgrst') || message.includes('postgrest')) {
    // Rate limiting
    if (message.includes('429') || message.includes('too many requests')) {
      return true;
    }
    // Server errors
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return true;
    }
  }

  // JWT expiration (can retry after refresh)
  if (message.includes('jwt') && message.includes('expired')) {
    return true;
  }

  return false;
}

/**
 * Wrapper for appointment operations with retry logic and user feedback
 */
export async function retryAppointmentOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let showingRetryToast = false;

  const result = await retryWithBackoff(operation, {
    maxAttempts: 3,
    baseDelay: 1500,
    maxDelay: 5000,
    onRetry: (attempt, error) => {
      if (!showingRetryToast && attempt > 1) {
        showingRetryToast = true;
        toast({
          title: 'Connection Issue',
          description: `Retrying ${operationName}... (Attempt ${attempt})`,
          duration: 2000,
        });
      }
    },
  });

  if (!result.success) {
    logger.error(`${operationName} failed after ${result.attempts} attempts:`, result.error);

    // Provide user-friendly error message
    const errorMessage = result.error?.message || 'Unknown error';

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      toast({
        title: 'Network Error',
        description: 'Please check your internet connection and try again.',
        variant: 'destructive',
      });
    } else if (errorMessage.includes('timeout')) {
      toast({
        title: 'Request Timeout',
        description: 'The operation took too long. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Operation Failed',
        description: `Failed to ${operationName.toLowerCase()}. Please try again.`,
        variant: 'destructive',
      });
    }

    throw result.error;
  }

  return result.data as T;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.resetTimeout) {
        logger.info('Circuit breaker transitioning to half-open');
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - too many recent failures');
      }
    }

    try {
      const result = await operation();

      if (this.state === 'half-open') {
        logger.info('Circuit breaker closing after successful operation');
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      logger.warn(`Circuit breaker opening after ${this.failures} failures`);
      this.state = 'open';
    }
  }

  private reset() {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'closed';
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Global circuit breaker for appointment operations
export const appointmentCircuitBreaker = new CircuitBreaker(5, 60000);
