/**
 * Type-safe error handling utilities.
 * Use these instead of `error: any` in catch blocks.
 */

/**
 * Safely extracts error message from unknown error type.
 * Use in catch blocks instead of `error: any`.
 * 
 * @example
 * try {
 *   await something();
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   toast.error(message);
 * }
 */
export function getErrorMessage(error: unknown): string {
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
        return getErrorMessage(error);
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
