import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobilePullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function MobilePullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  className,
}: MobilePullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  
  const opacity = useTransform(pullDistance, [0, threshold], [0, 1]);
  const scale = useTransform(pullDistance, [0, threshold], [0.5, 1]);
  const rotate = useTransform(pullDistance, [0, threshold * 2], [0, 360]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      e.preventDefault();
      // Apply resistance to pull
      const resistance = 0.5;
      const pull = Math.min(diff * resistance, threshold * 1.5);
      pullDistance.set(pull);
    }
  }, [isPulling, disabled, isRefreshing, threshold, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    const currentPull = pullDistance.get();
    
    if (currentPull >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([20, 50, 20]);
      }
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { duration: 0.3 });
      }
    } else {
      animate(pullDistance, 0, { duration: 0.3 });
    }
  }, [isPulling, disabled, threshold, isRefreshing, onRefresh, pullDistance]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className={cn("relative overflow-auto", className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ 
          height: pullDistance,
          opacity 
        }}
      >
        <motion.div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "bg-primary/10 border border-primary/20",
            isRefreshing && "bg-primary text-primary-foreground"
          )}
          style={{ scale }}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <motion.div style={{ rotate }}>
              <RefreshCw className="h-5 w-5 text-primary" />
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ 
          y: pullDistance,
          transition: isPulling ? "none" : "transform 0.3s ease-out"
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
