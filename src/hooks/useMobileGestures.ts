import { useCallback, useRef, useState } from "react";

export type HapticIntensity = "light" | "medium" | "heavy";

interface HapticPattern {
  light: number[];
  medium: number[];
  heavy: number[];
  success: number[];
  warning: number[];
  error: number[];
  selection: number[];
}

const hapticPatterns: HapticPattern = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [10, 50, 10, 50, 30],
  warning: [30, 100, 30],
  error: [50, 100, 50, 100, 50],
  selection: [5],
};

export function useHapticFeedback() {
  const canVibrate = typeof navigator !== "undefined" && "vibrate" in navigator;

  const vibrate = useCallback((pattern: keyof HapticPattern | number[]) => {
    if (!canVibrate) return false;
    
    const vibrationPattern = Array.isArray(pattern) 
      ? pattern 
      : hapticPatterns[pattern];
    
    try {
      return navigator.vibrate(vibrationPattern);
    } catch {
      return false;
    }
  }, [canVibrate]);

  const light = useCallback(() => vibrate("light"), [vibrate]);
  const medium = useCallback(() => vibrate("medium"), [vibrate]);
  const heavy = useCallback(() => vibrate("heavy"), [vibrate]);
  const success = useCallback(() => vibrate("success"), [vibrate]);
  const warning = useCallback(() => vibrate("warning"), [vibrate]);
  const error = useCallback(() => vibrate("error"), [vibrate]);
  const selection = useCallback(() => vibrate("selection"), [vibrate]);

  return {
    canVibrate,
    vibrate,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
  };
}

export function useLongPress(
  onLongPress: () => void,
  options: {
    threshold?: number;
    onPress?: () => void;
    onCancel?: () => void;
  } = {}
) {
  const { threshold = 500, onPress, onCancel } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPressRef.current) {
      onCancel?.();
    }
  }, [onCancel]);

  const end = useCallback(() => {
    cancel();
    if (!isLongPressRef.current) {
      onPress?.();
    }
  }, [cancel, onPress]);

  return {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
  };
}

export function useDoubleTap(
  onDoubleTap: () => void,
  options: {
    delay?: number;
    onSingleTap?: () => void;
  } = {}
) {
  const { delay = 300, onSingleTap } = options;
  const lastTapRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;

    if (timeDiff < delay && timeDiff > 0) {
      // Double tap detected
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onDoubleTap();
    } else {
      // Potential single tap - wait to see if there's a second
      timerRef.current = setTimeout(() => {
        onSingleTap?.();
      }, delay);
    }

    lastTapRef.current = now;
  }, [delay, onDoubleTap, onSingleTap]);

  return { onClick: handleTap };
}

export function usePinchZoom(
  onZoom: (scale: number) => void,
  options: {
    minScale?: number;
    maxScale?: number;
  } = {}
) {
  const { minScale = 0.5, maxScale = 3 } = options;
  const [scale, setScale] = useState(1);
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);

  const getDistance = (touches: React.TouchList) => {
    const [touch1, touch2] = [touches[0], touches[1]];
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistanceRef.current = getDistance(e.touches);
      initialScaleRef.current = scale;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistanceRef.current !== null) {
      const currentDistance = getDistance(e.touches);
      const scaleFactor = currentDistance / initialDistanceRef.current;
      const newScale = Math.min(
        Math.max(initialScaleRef.current * scaleFactor, minScale),
        maxScale
      );
      setScale(newScale);
      onZoom(newScale);
    }
  }, [minScale, maxScale, onZoom]);

  const handleTouchEnd = useCallback(() => {
    initialDistanceRef.current = null;
  }, []);

  return {
    scale,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

export function useSwipeGesture(
  onSwipe: (direction: "left" | "right" | "up" | "down") => void,
  options: {
    threshold?: number;
    velocityThreshold?: number;
  } = {}
) {
  const { threshold = 50, velocityThreshold = 0.3 } = options;
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!startRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;
    const dt = Date.now() - startRef.current.time;
    
    const velocityX = Math.abs(dx) / dt;
    const velocityY = Math.abs(dy) / dt;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    if (isHorizontal && Math.abs(dx) > threshold && velocityX > velocityThreshold) {
      onSwipe(dx > 0 ? "right" : "left");
    } else if (!isHorizontal && Math.abs(dy) > threshold && velocityY > velocityThreshold) {
      onSwipe(dy > 0 ? "down" : "up");
    }

    startRef.current = null;
  }, [threshold, velocityThreshold, onSwipe]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
