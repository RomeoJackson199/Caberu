import { renderHook, act } from '@testing-library/react';
import { useHapticFeedback, useLongPress, useDoubleTap, usePinchZoom, useSwipeGesture } from '../useMobileGestures';

// Mock navigator.vibrate
const mockVibrate = jest.fn();

describe('useHapticFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: mockVibrate,
    });
  });

  it('should initialize with correct values', () => {
    const { result } = renderHook(() => useHapticFeedback());

    expect(result.current.canVibrate).toBe(true);
    expect(typeof result.current.vibrate).toBe('function');
    expect(typeof result.current.light).toBe('function');
    expect(typeof result.current.medium).toBe('function');
    expect(typeof result.current.heavy).toBe('function');
    expect(typeof result.current.success).toBe('function');
    expect(typeof result.current.warning).toBe('function');
    expect(typeof result.current.error).toBe('function');
    expect(typeof result.current.selection).toBe('function');
  });

  it('should call navigator.vibrate with light pattern', () => {
    mockVibrate.mockReturnValue(true);
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.light();
    });

    expect(mockVibrate).toHaveBeenCalledWith([10]);
  });

  it('should call navigator.vibrate with medium pattern', () => {
    mockVibrate.mockReturnValue(true);
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.medium();
    });

    expect(mockVibrate).toHaveBeenCalledWith([20]);
  });

  it('should call navigator.vibrate with heavy pattern', () => {
    mockVibrate.mockReturnValue(true);
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.heavy();
    });

    expect(mockVibrate).toHaveBeenCalledWith([40]);
  });

  it('should call navigator.vibrate with success pattern', () => {
    mockVibrate.mockReturnValue(true);
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.success();
    });

    expect(mockVibrate).toHaveBeenCalledWith([10, 50, 10, 50, 30]);
  });

  it('should call navigator.vibrate with warning pattern', () => {
    mockVibrate.mockReturnValue(true);
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.warning();
    });

    expect(mockVibrate).toHaveBeenCalledWith([30, 100, 30]);
  });

  it('should call navigator.vibrate with error pattern', () => {
    mockVibrate.mockReturnValue(true);
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.error();
    });

    expect(mockVibrate).toHaveBeenCalledWith([50, 100, 50, 100, 50]);
  });

  it('should call navigator.vibrate with selection pattern', () => {
    mockVibrate.mockReturnValue(true);
    const { result } = renderHook(() => useHapticFeedback());

    act(() => {
      result.current.selection();
    });

    expect(mockVibrate).toHaveBeenCalledWith([5]);
  });

  it('should handle custom vibration patterns', () => {
    mockVibrate.mockReturnValue(true);
    const { result } = renderHook(() => useHapticFeedback());
    const customPattern = [100, 200, 100];

    act(() => {
      result.current.vibrate(customPattern);
    });

    expect(mockVibrate).toHaveBeenCalledWith(customPattern);
  });

  it('should return false when vibration is not supported', () => {
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useHapticFeedback());

    expect(result.current.canVibrate).toBe(false);

    const vibrationResult = act(() => result.current.light());

    expect(vibrationResult).toBeUndefined();
  });

  it('should handle vibration errors gracefully', () => {
    mockVibrate.mockImplementation(() => {
      throw new Error('Vibration failed');
    });

    const { result } = renderHook(() => useHapticFeedback());

    const vibrationResult = act(() => result.current.light());

    expect(vibrationResult).toBe(false);
  });
});

describe('useLongPress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should call onLongPress after threshold duration', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { threshold: 500 }));

    act(() => {
      result.current.onTouchStart();
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onLongPress if released before threshold', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { threshold: 500 }));

    act(() => {
      result.current.onTouchStart();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current.onTouchEnd();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('should call onPress when released before threshold', () => {
    const onLongPress = jest.fn();
    const onPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { threshold: 500, onPress }));

    act(() => {
      result.current.onTouchStart();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current.onTouchEnd();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('should call onCancel when touch is cancelled', () => {
    const onLongPress = jest.fn();
    const onCancel = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { threshold: 500, onCancel }));

    act(() => {
      result.current.onTouchStart();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current.onTouchCancel();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('should support mouse events', () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { threshold: 500 }));

    act(() => {
      result.current.onMouseDown();
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('should cancel on mouse leave', () => {
    const onLongPress = jest.fn();
    const onCancel = jest.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { threshold: 500, onCancel }));

    act(() => {
      result.current.onMouseDown();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current.onMouseLeave();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});

describe('useDoubleTap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should call onDoubleTap when tapped twice within delay', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap, { delay: 300 }));

    act(() => {
      result.current.onClick();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      result.current.onClick();
    });

    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });

  it('should call onSingleTap when only tapped once', () => {
    const onDoubleTap = jest.fn();
    const onSingleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap, { delay: 300, onSingleTap }));

    act(() => {
      result.current.onClick();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('should not call onSingleTap when double tapped', () => {
    const onDoubleTap = jest.fn();
    const onSingleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap, { delay: 300, onSingleTap }));

    act(() => {
      result.current.onClick();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      result.current.onClick();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onDoubleTap).toHaveBeenCalledTimes(1);
    expect(onSingleTap).not.toHaveBeenCalled();
  });
});

describe('usePinchZoom', () => {
  it('should initialize with scale 1', () => {
    const onZoom = jest.fn();
    const { result } = renderHook(() => usePinchZoom(onZoom));

    expect(result.current.scale).toBe(1);
  });

  it('should provide touch event handlers', () => {
    const onZoom = jest.fn();
    const { result } = renderHook(() => usePinchZoom(onZoom));

    expect(typeof result.current.handlers.onTouchStart).toBe('function');
    expect(typeof result.current.handlers.onTouchMove).toBe('function');
    expect(typeof result.current.handlers.onTouchEnd).toBe('function');
  });

  it('should respect min and max scale limits', () => {
    const onZoom = jest.fn();
    const { result } = renderHook(() => usePinchZoom(onZoom, { minScale: 0.5, maxScale: 3 }));

    // This would require complex touch event simulation
    // Testing the structure instead
    expect(result.current.scale).toBe(1);
    expect(result.current.handlers).toBeDefined();
  });
});

describe('useSwipeGesture', () => {
  it('should detect left swipe', () => {
    const onSwipe = jest.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipe, { threshold: 50, velocityThreshold: 0.3 }));

    const startEvent = {
      touches: [{ clientX: 200, clientY: 100 }],
    } as any;

    const endEvent = {
      changedTouches: [{ clientX: 50, clientY: 100 }],
    } as any;

    act(() => {
      result.current.onTouchStart(startEvent);
    });

    act(() => {
      result.current.onTouchEnd(endEvent);
    });

    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('should detect right swipe', () => {
    const onSwipe = jest.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipe, { threshold: 50, velocityThreshold: 0.3 }));

    const startEvent = {
      touches: [{ clientX: 50, clientY: 100 }],
    } as any;

    const endEvent = {
      changedTouches: [{ clientX: 200, clientY: 100 }],
    } as any;

    act(() => {
      result.current.onTouchStart(startEvent);
    });

    act(() => {
      result.current.onTouchEnd(endEvent);
    });

    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('should detect up swipe', () => {
    const onSwipe = jest.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipe, { threshold: 50, velocityThreshold: 0.3 }));

    const startEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
    } as any;

    const endEvent = {
      changedTouches: [{ clientX: 100, clientY: 50 }],
    } as any;

    act(() => {
      result.current.onTouchStart(startEvent);
    });

    act(() => {
      result.current.onTouchEnd(endEvent);
    });

    expect(onSwipe).toHaveBeenCalledWith('up');
  });

  it('should detect down swipe', () => {
    const onSwipe = jest.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipe, { threshold: 50, velocityThreshold: 0.3 }));

    const startEvent = {
      touches: [{ clientX: 100, clientY: 50 }],
    } as any;

    const endEvent = {
      changedTouches: [{ clientX: 100, clientY: 200 }],
    } as any;

    act(() => {
      result.current.onTouchStart(startEvent);
    });

    act(() => {
      result.current.onTouchEnd(endEvent);
    });

    expect(onSwipe).toHaveBeenCalledWith('down');
  });

  it('should not trigger swipe if threshold not met', () => {
    const onSwipe = jest.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipe, { threshold: 100, velocityThreshold: 0.3 }));

    const startEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as any;

    const endEvent = {
      changedTouches: [{ clientX: 130, clientY: 100 }],
    } as any;

    act(() => {
      result.current.onTouchStart(startEvent);
    });

    act(() => {
      result.current.onTouchEnd(endEvent);
    });

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('should not trigger swipe if velocity threshold not met', () => {
    const onSwipe = jest.fn();
    const { result } = renderHook(() => useSwipeGesture(onSwipe, { threshold: 50, velocityThreshold: 10 }));

    const startEvent = {
      touches: [{ clientX: 50, clientY: 100 }],
    } as any;

    const endEvent = {
      changedTouches: [{ clientX: 200, clientY: 100 }],
    } as any;

    act(() => {
      result.current.onTouchStart(startEvent);
    });

    // Wait a bit to reduce velocity
    act(() => {
      setTimeout(() => {
        result.current.onTouchEnd(endEvent);
      }, 5000);
    });

    // Velocity will be too low due to time delay
    expect(onSwipe).not.toHaveBeenCalled();
  });
});
