import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh = ({
  children,
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  className,
  disabled = false,
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);

  const opacity = useTransform(pullDistance, [0, threshold], [0, 1]);
  const scale = useTransform(pullDistance, [0, threshold], [0.5, 1]);
  const rotation = useTransform(pullDistance, [0, maxPullDistance], [0, 360]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);

      // Apply resistance to pull distance
      const resistedDistance = Math.min(
        distance * 0.5,
        maxPullDistance
      );

      pullDistance.set(resistedDistance);

      // Prevent default scrolling when pulling
      if (distance > 0) {
        e.preventDefault();
      }
    },
    [isPulling, disabled, isRefreshing, maxPullDistance, pullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);

    const distance = pullDistance.get();

    if (distance >= threshold && !isRefreshing) {
      setIsRefreshing(true);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 5, 10]);
      }

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
  }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Auto-hide when done
  useEffect(() => {
    if (!isRefreshing) {
      pullDistance.set(0);
    }
  }, [isRefreshing, pullDistance]);

  const currentDistance = pullDistance.get();
  const shouldRelease = currentDistance >= threshold;

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center z-50 pointer-events-none"
            style={{
              y: isRefreshing ? threshold : pullDistance,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="backdrop-blur-xl bg-white/40 dark:bg-black/40 rounded-full p-3 border border-white/20 shadow-lg">
              {isRefreshing ? (
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              ) : (
                <motion.div style={{ rotate: rotation, scale, opacity }}>
                  <RefreshCw className="w-6 h-6 text-blue-500" />
                </motion.div>
              )}
            </div>

            <motion.p
              className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300"
              style={{ opacity }}
            >
              {isRefreshing
                ? refreshingText
                : shouldRelease
                  ? releaseText
                  : pullText}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        style={{
          y: isRefreshing ? threshold : pullDistance,
        }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 300,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
