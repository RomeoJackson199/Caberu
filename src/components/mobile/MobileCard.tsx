import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Trash2, Archive, Star, MoreHorizontal } from "lucide-react";
import { useState, ReactNode } from "react";

interface SwipeAction {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onAction: () => void;
  label: string;
}

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  onLongPress?: () => void;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  swipeThreshold?: number;
  interactive?: boolean;
}

export function MobileCard({
  children,
  className,
  onTap,
  onLongPress,
  leftActions = [],
  rightActions = [],
  swipeThreshold = 80,
  interactive = true,
}: MobileCardProps) {
  const [isRevealed, setIsRevealed] = useState<"left" | "right" | null>(null);
  const x = useMotionValue(0);
  
  const leftActionsWidth = leftActions.length * 64;
  const rightActionsWidth = rightActions.length * 64;
  
  const leftOpacity = useTransform(x, [0, leftActionsWidth], [0, 1]);
  const rightOpacity = useTransform(x, [-rightActionsWidth, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    if (offset > swipeThreshold && leftActions.length > 0) {
      setIsRevealed("left");
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);
    } else if (offset < -swipeThreshold && rightActions.length > 0) {
      setIsRevealed("right");
      if (navigator.vibrate) navigator.vibrate(10);
    } else {
      setIsRevealed(null);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    setIsRevealed(null);
    action.onAction();
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  };

  const resetPosition = () => {
    setIsRevealed(null);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left actions */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-stretch"
          style={{ opacity: leftOpacity }}
        >
          {leftActions.map((action, index) => (
            <motion.button
              key={index}
              className={cn(
                "flex items-center justify-center w-16",
                action.bgColor
              )}
              onClick={() => handleActionClick(action)}
              whileTap={{ scale: 0.95 }}
            >
              <action.icon className={cn("h-5 w-5", action.color)} />
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-stretch"
          style={{ opacity: rightOpacity }}
        >
          {rightActions.map((action, index) => (
            <motion.button
              key={index}
              className={cn(
                "flex items-center justify-center w-16",
                action.bgColor
              )}
              onClick={() => handleActionClick(action)}
              whileTap={{ scale: 0.95 }}
            >
              <action.icon className={cn("h-5 w-5", action.color)} />
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Card content */}
      <motion.div
        className={cn(
          "relative bg-card border border-border rounded-xl",
          "touch-pan-y",
          interactive && "cursor-pointer active:bg-muted/50",
          className
        )}
        style={{ x }}
        drag={leftActions.length > 0 || rightActions.length > 0 ? "x" : false}
        dragConstraints={{
          left: rightActions.length > 0 ? -rightActionsWidth : 0,
          right: leftActions.length > 0 ? leftActionsWidth : 0,
        }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{
          x: isRevealed === "left" 
            ? leftActionsWidth 
            : isRevealed === "right" 
              ? -rightActionsWidth 
              : 0,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onClick={isRevealed ? resetPosition : onTap}
        onTapStart={() => {
          if (onLongPress) {
            const timeout = setTimeout(() => {
              if (navigator.vibrate) navigator.vibrate(50);
              onLongPress();
            }, 500);
            return () => clearTimeout(timeout);
          }
        }}
        whileTap={interactive && !isRevealed ? { scale: 0.98 } : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Pre-configured swipe actions
export const swipeActions = {
  delete: (onAction: () => void): SwipeAction => ({
    icon: Trash2,
    color: "text-white",
    bgColor: "bg-destructive",
    onAction,
    label: "Delete",
  }),
  archive: (onAction: () => void): SwipeAction => ({
    icon: Archive,
    color: "text-white",
    bgColor: "bg-warning",
    onAction,
    label: "Archive",
  }),
  complete: (onAction: () => void): SwipeAction => ({
    icon: Check,
    color: "text-white",
    bgColor: "bg-success",
    onAction,
    label: "Complete",
  }),
  star: (onAction: () => void): SwipeAction => ({
    icon: Star,
    color: "text-white",
    bgColor: "bg-primary",
    onAction,
    label: "Star",
  }),
  more: (onAction: () => void): SwipeAction => ({
    icon: MoreHorizontal,
    color: "text-white",
    bgColor: "bg-muted-foreground",
    onAction,
    label: "More",
  }),
};
