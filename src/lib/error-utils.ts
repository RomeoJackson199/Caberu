/**
 * Utility functions for type-safe error handling
 */

/**
 * Extract error message from unknown error type
 * Use this in catch blocks instead of `catch (error: any)`
 * 
 * @example
 * ```ts
 * try {
 *   await doSomething();
 * } catch (error: unknown) {
 *   const message = getErrorMessage(error);
 *   toast.error(message);
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Type guard to check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if error has a specific property
 */
export function hasErrorProperty<K extends string>(
  error: unknown,
  property: K
): error is Record<K, unknown> {
  return (
    error !== null &&
    typeof error === 'object' &&
    property in error
  );
}

/**
 * Extract error details for logging/reporting
 */
export function getErrorDetails(error: unknown): {
  message: string;
  name?: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: hasErrorProperty(error, 'code') ? String(error.code) : undefined,
    };
  }
  
  return {
    message: getErrorMessage(error),
  };
}

/**
 * Safely execute an async function and return a tuple of [result, error]
 * Inspired by Go-style error handling
 * 
 * @example
 * ```ts
 * const [data, error] = await safeAsync(fetchData());
 * if (error) {
 *   handleError(error);
 *   return;
 * }
 * // data is typed correctly here
 * ```
 */
export async function safeAsync<T>(
  promise: Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(getErrorMessage(error))];
  }
}
