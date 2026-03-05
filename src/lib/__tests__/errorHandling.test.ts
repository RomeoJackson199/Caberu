/**
 * Tests for error-handling/formatting.ts - Error formatting and handling utilities
 */

import {
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
  getUserFriendlyErrorMessage,
  getErrorMessage,
} from '../error-handling/formatting';

describe('error-handling/formatting.ts', () => {
  describe('DashboardError', () => {
    it('should create error with all properties', () => {
      const error = new DashboardError('Test message', 'TEST_CODE', { detail: 'info' }, 'User message');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.userFriendly).toBe('User message');
      expect(error.name).toBe('DashboardError');
    });

    it('should use defaults for optional properties', () => {
      const error = new DashboardError('Test message');

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.details).toBeUndefined();
      expect(error.userFriendly).toBe('Test message');
    });

    it('should be instanceof Error', () => {
      const error = new DashboardError('Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof DashboardError).toBe(true);
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(extractErrorMessage(error)).toBe('Test error message');
    });

    it('should return string error directly', () => {
      expect(extractErrorMessage('String error')).toBe('String error');
    });

    it('should extract message from object with message property', () => {
      const error = { message: 'Object error message' };
      expect(extractErrorMessage(error)).toBe('Object error message');
    });

    it('should return default message for unknown error types', () => {
      expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
      expect(extractErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(extractErrorMessage(123)).toBe('An unexpected error occurred');
      expect(extractErrorMessage({})).toBe('An unexpected error occurred');
    });
  });

  describe('formatErrorMessage', () => {
    it('should return error message for Error instance', () => {
      const error = new Error('Error message');
      expect(formatErrorMessage(error)).toBe('Error message');
    });

    it('should return string error directly', () => {
      expect(formatErrorMessage('Direct string')).toBe('Direct string');
    });

    it('should return userFriendly message from DashboardError', () => {
      const error = new DashboardError('Internal', 'CODE', null, 'User friendly');
      expect(formatErrorMessage(error)).toBe('User friendly');
    });

    it('should use fallback for null/undefined error', () => {
      expect(formatErrorMessage(null)).toBe('Something went wrong. Please try again.');
      expect(formatErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
    });

    it('should use custom fallback', () => {
      expect(formatErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });

    it('should extract message from object', () => {
      const error = { message: 'Object message' };
      expect(formatErrorMessage(error)).toBe('Object message');
    });
  });

  describe('isErrorWithCode', () => {
    it('should return true for error with code and message', () => {
      const error = { code: 'ERROR_CODE', message: 'Error message' };
      expect(isErrorWithCode(error)).toBe(true);
    });

    it('should return false for error without code', () => {
      const error = { message: 'Error message' };
      expect(isErrorWithCode(error)).toBe(false);
    });

    it('should return false for error without message', () => {
      const error = { code: 'ERROR_CODE' };
      expect(isErrorWithCode(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isErrorWithCode(null)).toBe(false);
    });

    it('should return false for primitive types', () => {
      expect(isErrorWithCode('string')).toBe(false);
      expect(isErrorWithCode(123)).toBe(false);
    });
  });

  describe('getSupabaseErrorMessage', () => {
    it('should return mapped message for known error codes', () => {
      expect(getSupabaseErrorMessage({ code: 'PGRST116', message: 'original' })).toBe('Record not found');
      expect(getSupabaseErrorMessage({ code: 'PGRST301', message: 'original' })).toBe('Access denied');
      expect(getSupabaseErrorMessage({ code: '23505', message: 'original' })).toBe('This record already exists');
      expect(getSupabaseErrorMessage({ code: '23503', message: 'original' })).toBe('Cannot delete - this record is in use');
      expect(getSupabaseErrorMessage({ code: '42501', message: 'original' })).toBe('Permission denied');
      expect(getSupabaseErrorMessage({ code: 'invalid_credentials', message: 'original' })).toBe('Invalid email or password');
      expect(getSupabaseErrorMessage({ code: 'email_not_confirmed', message: 'original' })).toBe('Please verify your email first');
    });

    it('should return original message for unknown error codes', () => {
      expect(getSupabaseErrorMessage({ code: 'UNKNOWN', message: 'Original message' })).toBe('Original message');
    });

    it('should use extractErrorMessage for non-coded errors', () => {
      expect(getSupabaseErrorMessage(new Error('Regular error'))).toBe('Regular error');
    });
  });

  describe('handleDatabaseError', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle PGRST116 (no rows) error', () => {
      const error = { code: 'PGRST116', message: 'No rows found' };
      const result = handleDatabaseError(error, 'test context');

      expect(result.code).toBe('NO_DATA');
      expect(result.userFriendly).toContain('No data found');
    });

    it('should handle 23505 (duplicate key) error', () => {
      const error = { code: '23505', message: 'Duplicate' };
      const result = handleDatabaseError(error, 'test context');

      expect(result.code).toBe('DUPLICATE_KEY');
      expect(result.userFriendly).toContain('already exists');
    });

    it('should handle 23503 (foreign key) error', () => {
      const error = { code: '23503', message: 'FK violation' };
      const result = handleDatabaseError(error, 'test context');

      expect(result.code).toBe('FOREIGN_KEY');
      expect(result.userFriendly).toContain('Invalid reference');
    });

    it('should handle 42P01 (table not found) error', () => {
      const error = { code: '42P01', message: 'Table not found' };
      const result = handleDatabaseError(error, 'test context');

      expect(result.code).toBe('TABLE_NOT_FOUND');
      expect(result.userFriendly).toContain('configuration error');
    });

    it('should handle 42501 (permission denied) error', () => {
      const error = { code: '42501', message: 'Permission denied' };
      const result = handleDatabaseError(error, 'test context');

      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.userFriendly).toContain('permission');
    });

    it('should handle network errors', () => {
      const error = { message: 'Failed to fetch data' };
      const result = handleDatabaseError(error, 'test context');

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.userFriendly).toContain('Network');
    });

    it('should handle authentication errors', () => {
      const error = { message: 'JWT expired' };
      const result = handleDatabaseError(error, 'test context');

      expect(result.code).toBe('AUTH_ERROR');
      expect(result.userFriendly).toContain('Authentication');
    });

    it('should handle unknown errors with default response', () => {
      const error = { code: 'UNKNOWN_CODE', message: 'Unknown error' };
      const result = handleDatabaseError(error, 'test context');

      expect(result.code).toBe('UNKNOWN_CODE');
      expect(result.userFriendly).toContain('database error');
    });

    it('should log error to console', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      handleDatabaseError({ message: 'test' }, 'test context');

      expect(consoleSpy).toHaveBeenCalledWith('Database error in test context:', expect.anything());
    });
  });

  describe('formatErrorForUser', () => {
    it('should return string error directly', () => {
      expect(formatErrorForUser('Direct error')).toBe('Direct error');
    });

    it('should return userFriendly message when available', () => {
      const error = { userFriendly: 'User friendly message', message: 'Internal message' };
      expect(formatErrorForUser(error)).toBe('User friendly message');
    });

    it('should return message when userFriendly not available', () => {
      const error = { message: 'Error message' };
      expect(formatErrorForUser(error)).toBe('Error message');
    });

    it('should return default message for unknown errors', () => {
      expect(formatErrorForUser(null)).toBe('An unexpected error occurred. Please try again.');
      expect(formatErrorForUser({})).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('isNetworkError', () => {
    it('should return true for fetch errors', () => {
      expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
    });

    it('should return true for network errors', () => {
      expect(isNetworkError({ message: 'network error occurred' })).toBe(true);
    });

    it('should return true for NETWORK_ERROR code', () => {
      expect(isNetworkError({ code: 'NETWORK_ERROR' })).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isNetworkError({ message: 'Some other error' })).toBe(false);
      expect(isNetworkError({ code: 'OTHER_CODE' })).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('should return true for JWT errors', () => {
      expect(isAuthError({ message: 'JWT expired' })).toBe(true);
      expect(isAuthError({ message: 'Invalid JWT' })).toBe(true);
    });

    it('should return true for auth errors', () => {
      expect(isAuthError({ message: 'auth failed' })).toBe(true);
      expect(isAuthError({ message: 'authentication required' })).toBe(true);
    });

    it('should return true for AUTH_ERROR code', () => {
      expect(isAuthError({ code: 'AUTH_ERROR' })).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isAuthError({ message: 'Some other error' })).toBe(false);
      expect(isAuthError({ code: 'OTHER_CODE' })).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    it('should return false for auth errors', () => {
      expect(shouldRetry({ message: 'JWT expired' })).toBe(false);
      expect(shouldRetry({ code: 'AUTH_ERROR' })).toBe(false);
    });

    it('should return false for validation errors', () => {
      expect(shouldRetry({ code: 'VALIDATION_ERROR' })).toBe(false);
    });

    it('should return true for network errors', () => {
      expect(shouldRetry({ message: 'Failed to fetch' })).toBe(true);
      expect(shouldRetry({ code: 'NETWORK_ERROR' })).toBe(true);
    });

    it('should return true for temporary errors', () => {
      expect(shouldRetry({ code: 'TEMPORARY_ERROR' })).toBe(true);
    });

    it('should return true for timeout errors', () => {
      expect(shouldRetry({ code: 'TIMEOUT_ERROR' })).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(shouldRetry({ code: 'OTHER_ERROR' })).toBe(false);
      expect(shouldRetry({ message: 'Some error' })).toBe(false);
    });
  });

  describe('Backward compatibility aliases', () => {
    it('should have getUserFriendlyErrorMessage as alias', () => {
      expect(getUserFriendlyErrorMessage).toBe(formatErrorMessage);
    });

    it('should have getErrorMessage as alias', () => {
      expect(getErrorMessage).toBe(extractErrorMessage);
    });
  });
});
