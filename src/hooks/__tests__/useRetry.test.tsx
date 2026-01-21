import { renderHook, waitFor } from '@testing-library/react';
import { useRetry } from '@/hooks/useRetry';
import { logger } from '@/lib/logger';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('useRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useRetry());

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
      expect(typeof result.current.retry).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should successfully execute function on first attempt', async () => {
      const { result } = renderHook(() => useRetry());
      const mockFn = jest.fn().mockResolvedValue('success');

      const promise = result.current.retry(mockFn);
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1));

      const returnValue = await promise;
      expect(returnValue).toBe('success');
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });

    it('should accept custom retry options', () => {
      const { result } = renderHook(() =>
        useRetry({
          maxRetries: 5,
          delay: 2000,
          backoff: false,
        })
      );

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed function up to maxRetries times', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 3, delay: 100 }));
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

      const promise = result.current.retry(mockFn);

      // Fast-forward through all retries
      for (let i = 0; i <= 3; i++) {
        await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(i + 1));
        jest.advanceTimersByTime(1000);
      }

      await expect(promise).rejects.toThrow('Failed');
      expect(mockFn).toHaveBeenCalledTimes(4); // Initial attempt + 3 retries
      expect(logger.warn).toHaveBeenCalledTimes(4);
    });

    it('should succeed on retry after initial failure', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 3, delay: 100 }));
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce('success');

      const promise = result.current.retry(mockFn);

      // First attempt fails
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1));
      jest.advanceTimersByTime(100);

      // Second attempt succeeds
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(2));

      const returnValue = await promise;
      expect(returnValue).toBe('success');
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });

    it('should update retryCount during retries', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 100 }));
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const promise = result.current.retry(mockFn);

      // First attempt
      await waitFor(() => expect(result.current.retryCount).toBe(0));
      jest.advanceTimersByTime(100);

      // First retry
      await waitFor(() => expect(result.current.retryCount).toBe(1));
      jest.advanceTimersByTime(200);

      // Second retry
      await waitFor(() => expect(result.current.retryCount).toBe(2));

      await promise;
      expect(result.current.retryCount).toBe(0);
    });

    it('should set isRetrying to true during retries', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 100 }));
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      expect(result.current.isRetrying).toBe(false);

      const promise = result.current.retry(mockFn);

      // After first failure, should be retrying
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1));
      jest.advanceTimersByTime(100);

      await waitFor(() => expect(result.current.isRetrying).toBe(true));

      // After success, should not be retrying
      await promise;
      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('Backoff Strategy', () => {
    it('should use exponential backoff when enabled', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 3, delay: 100, backoff: true }));
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

      const promise = result.current.retry(mockFn);

      // First attempt (no delay)
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1));

      // First retry: delay = 100 * 2^0 = 100ms
      jest.advanceTimersByTime(100);
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(2));

      // Second retry: delay = 100 * 2^1 = 200ms
      jest.advanceTimersByTime(200);
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(3));

      // Third retry: delay = 100 * 2^2 = 400ms
      jest.advanceTimersByTime(400);
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(4));

      await expect(promise).rejects.toThrow('Failed');
    });

    it('should use constant delay when backoff is disabled', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 3, delay: 100, backoff: false }));
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

      const promise = result.current.retry(mockFn);

      // First attempt (no delay)
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1));

      // Each retry should use same 100ms delay
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(100);
        await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(i + 2));
      }

      await expect(promise).rejects.toThrow('Failed');
    });
  });

  describe('Error Handling', () => {
    it('should call onError callback on each failure', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 100 }));
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const onError = jest.fn();

      const promise = result.current.retry(mockFn, onError);

      // Execute all retries
      for (let i = 0; i <= 2; i++) {
        await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(i + 1));
        jest.advanceTimersByTime(200);
      }

      await expect(promise).rejects.toThrow('Failed');
      expect(onError).toHaveBeenCalledTimes(3); // Called for each failure
      expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Number));
    });

    it('should pass correct attempt number to onError', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 100 }));
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const onError = jest.fn();

      const promise = result.current.retry(mockFn, onError);

      // Execute all retries
      for (let i = 0; i <= 2; i++) {
        await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(i + 1));
        jest.advanceTimersByTime(200);
      }

      await expect(promise).rejects.toThrow('Failed');
      expect(onError).toHaveBeenNthCalledWith(1, expect.any(Error), 0);
      expect(onError).toHaveBeenNthCalledWith(2, expect.any(Error), 1);
      expect(onError).toHaveBeenNthCalledWith(3, expect.any(Error), 2);
    });

    it('should throw the last error after all retries fail', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 100 }));
      const error = new Error('Final error');
      const mockFn = jest.fn().mockRejectedValue(error);

      const promise = result.current.retry(mockFn);

      // Execute all retries
      for (let i = 0; i <= 2; i++) {
        await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(i + 1));
        jest.advanceTimersByTime(200);
      }

      await expect(promise).rejects.toThrow('Final error');
      expect(result.current.isRetrying).toBe(false);
    });

    it('should log warnings for each failed attempt', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 100 }));
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

      const promise = result.current.retry(mockFn);

      // Execute all retries
      for (let i = 0; i <= 2; i++) {
        await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(i + 1));
        jest.advanceTimersByTime(200);
      }

      await expect(promise).rejects.toThrow('Failed');
      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Attempt'), expect.any(Error));
    });
  });

  describe('Reset Functionality', () => {
    it('should reset retryCount and isRetrying', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 100 }));
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      const promise = result.current.retry(mockFn);

      // Wait for retry
      await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1));
      jest.advanceTimersByTime(100);
      await waitFor(() => expect(result.current.isRetrying).toBe(true));

      // Reset
      result.current.reset();

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);

      await promise;
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxRetries of 0', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 0 }));
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

      await expect(result.current.retry(mockFn)).rejects.toThrow('Failed');
      expect(mockFn).toHaveBeenCalledTimes(1); // Only initial attempt, no retries
    });

    it('should handle synchronous errors', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 100 }));
      const mockFn = jest.fn(() => {
        throw new Error('Sync error');
      });

      const promise = result.current.retry(mockFn as any);

      // Execute all retries
      for (let i = 0; i <= 2; i++) {
        await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(i + 1));
        jest.advanceTimersByTime(200);
      }

      await expect(promise).rejects.toThrow('Sync error');
    });

    it('should handle zero delay', async () => {
      const { result } = renderHook(() => useRetry({ maxRetries: 2, delay: 0 }));
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      const returnValue = await result.current.retry(mockFn);

      expect(returnValue).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle typed return values', async () => {
      const { result } = renderHook(() => useRetry());
      const mockFn = jest.fn().mockResolvedValue({ data: 'test', count: 42 });

      const returnValue = await result.current.retry(mockFn);

      expect(returnValue).toEqual({ data: 'test', count: 42 });
    });
  });
});
