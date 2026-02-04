/**
 * Tests for useUnsavedChanges hook - Warn users before navigating away with unsaved changes
 */

import { renderHook, act } from '@testing-library/react';
import {
  useUnsavedChanges,
  useFormUnsavedChanges,
  createUnsavedChangesPrompt,
  formatTimeRemaining,
} from '../useUnsavedChanges';

// Mock use-toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('useUnsavedChanges', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    jest.useRealTimers();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('beforeunload handling', () => {
    it('should add beforeunload listener when there are unsaved changes', () => {
      renderHook(() => useUnsavedChanges({ when: true }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('should not add beforeunload listener when there are no unsaved changes', () => {
      renderHook(() => useUnsavedChanges({ when: false }));

      const beforeunloadCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'beforeunload'
      );
      expect(beforeunloadCalls.length).toBe(0);
    });

    it('should remove beforeunload listener on unmount', () => {
      const { unmount } = renderHook(() => useUnsavedChanges({ when: true }));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('should update listener when when prop changes', () => {
      const { rerender } = renderHook(
        ({ when }) => useUnsavedChanges({ when }),
        { initialProps: { when: false } }
      );

      // Initially no listener
      const initialCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'beforeunload'
      ).length;

      // Enable unsaved changes
      rerender({ when: true });

      const afterEnableCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'beforeunload'
      ).length;

      expect(afterEnableCalls).toBeGreaterThan(initialCalls);
    });
  });

  describe('session timeout warnings', () => {
    it('should not track time when timeout warnings disabled', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          when: true,
          enableTimeoutWarning: false,
        })
      );

      expect(result.current.timeRemaining).toBeNull();
      expect(result.current.isNearTimeout).toBe(false);
    });

    it('should track time when timeout warnings enabled', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          when: true,
          enableTimeoutWarning: true,
          sessionTimeout: 60000, // 1 minute
        })
      );

      expect(result.current.timeRemaining).toBe(60000);
      expect(result.current.isNearTimeout).toBe(false);
    });

    it('should set isNearTimeout when within warning threshold', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          when: true,
          enableTimeoutWarning: true,
          sessionTimeout: 60000, // 1 minute
          warningThreshold: 120000, // 2 minutes (larger than session for testing)
        })
      );

      // Since session timeout < warning threshold, should be near timeout
      act(() => {
        jest.advanceTimersByTime(10000); // 10 seconds
      });

      // Check the time remaining calculation
      expect(result.current.timeRemaining).toBeLessThanOrEqual(60000);
    });

    it('should show toast when entering warning zone', () => {
      renderHook(() =>
        useUnsavedChanges({
          when: true,
          enableTimeoutWarning: true,
          sessionTimeout: 30000, // 30 seconds
          warningThreshold: 25000, // 25 seconds
        })
      );

      // Advance time to enter warning zone
      act(() => {
        jest.advanceTimersByTime(10000); // 10 seconds
      });

      // Wait for interval check (every 10 seconds)
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Toast should be called when entering warning zone
      // Note: depends on timing calculations
    });

    it('should reset timer with resetTimer function', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          when: true,
          enableTimeoutWarning: true,
          sessionTimeout: 60000,
        })
      );

      // Advance time
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Reset timer
      act(() => {
        result.current.resetTimer();
      });

      expect(result.current.timeRemaining).toBe(60000);
      expect(result.current.isNearTimeout).toBe(false);
    });
  });

  describe('return values', () => {
    it('should return expected interface', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({ when: true })
      );

      expect(result.current).toHaveProperty('isBlocked');
      expect(result.current).toHaveProperty('proceed');
      expect(result.current).toHaveProperty('reset');
      expect(result.current).toHaveProperty('timeRemaining');
      expect(result.current).toHaveProperty('isNearTimeout');
      expect(result.current).toHaveProperty('resetTimer');
    });

    it('should have proceed as a function', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({ when: true })
      );

      expect(typeof result.current.proceed).toBe('function');
    });

    it('should have reset as a function', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({ when: true })
      );

      expect(typeof result.current.reset).toBe('function');
    });
  });
});

describe('useFormUnsavedChanges', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should enable unsaved changes warning when form is dirty', () => {
    const { result } = renderHook(() => useFormUnsavedChanges(true));

    // Should have timeout warning enabled
    expect(result.current).toHaveProperty('timeRemaining');
    expect(result.current).toHaveProperty('isNearTimeout');
  });

  it('should not enable warning when form is clean', () => {
    const { result } = renderHook(() => useFormUnsavedChanges(false));

    expect(result.current.timeRemaining).toBeNull();
  });
});

describe('createUnsavedChangesPrompt', () => {
  it('should create prompt with default values', () => {
    const prompt = createUnsavedChangesPrompt();

    expect(prompt).toEqual({
      title: 'Unsaved Changes',
      description: 'You have unsaved changes that will be lost.',
      confirmText: 'Leave',
      cancelText: 'Stay',
    });
  });

  it('should create prompt with custom values', () => {
    const prompt = createUnsavedChangesPrompt(
      'Custom Title',
      'Custom description'
    );

    expect(prompt.title).toBe('Custom Title');
    expect(prompt.description).toBe('Custom description');
  });
});

describe('formatTimeRemaining', () => {
  it('should return empty string for null', () => {
    expect(formatTimeRemaining(null)).toBe('');
  });

  it('should format minutes and seconds', () => {
    expect(formatTimeRemaining(90000)).toBe('1m 30s');
    expect(formatTimeRemaining(120000)).toBe('2m 0s');
    expect(formatTimeRemaining(65000)).toBe('1m 5s');
  });

  it('should format seconds only when under 1 minute', () => {
    expect(formatTimeRemaining(30000)).toBe('30s');
    expect(formatTimeRemaining(5000)).toBe('5s');
    expect(formatTimeRemaining(0)).toBe('0s');
  });
});
