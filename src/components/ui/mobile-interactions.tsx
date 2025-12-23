/**
 * Mobile Interaction Components
 * Enhanced swipe, drag-and-drop, and touch interactions for mobile
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Trash2, Archive, Pin, Star, MoreHorizontal, GripVertical, ChevronRight } from "lucide-react";

/**
 * Swipeable List Item with Actions
 */
interface SwipeAction {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface SwipeableItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
  threshold?: number;
  onSwipeComplete?: (direction: "left" | "right") => void;
}

export function SwipeableItem({
  children,
  leftActions = [],
  rightActions = [],
  className,
  threshold = 80,
  onSwipeComplete,
}: SwipeableItemProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const leftActionWidth = leftActions.length * 70;
  const rightActionWidth = rightActions.length * 70;

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > threshold && leftActions.length > 0) {
      // Swiped right - show left actions
      onSwipeComplete?.("right");
    } else if (offset < -threshold && rightActions.length > 0) {
      // Swiped left - show right actions
      onSwipeComplete?.("left");
    }
  };

  const backgroundOpacity = useTransform(
    x,
    [-200, 0, 200],
    [1, 0, 1]
  );

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left actions (revealed on right swipe) */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 flex items-center"
        style={{ opacity: backgroundOpacity }}
      >
        {leftActions.map((action, index) => (
          <motion.button
            key={action.label}
            className={cn(
              "flex flex-col items-center justify-center h-full px-4",
              action.bgColor
            )}
            onClick={action.onClick}
            whileTap={{ scale: 0.95 }}
          >
            <action.icon className={cn("h-5 w-5", action.color)} />
            <span className={cn("text-xs mt-1 font-medium", action.color)}>
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Right actions (revealed on left swipe) */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-center"
        style={{ opacity: backgroundOpacity }}
      >
        {rightActions.map((action, index) => (
          <motion.button
            key={action.label}
            className={cn(
              "flex flex-col items-center justify-center h-full px-4",
              action.bgColor
            )}
            onClick={action.onClick}
            whileTap={{ scale: 0.95 }}
          >
            <action.icon className={cn("h-5 w-5", action.color)} />
            <span className={cn("text-xs mt-1 font-medium", action.color)}>
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Main content */}
      <motion.div
        className="relative bg-background z-10"
        drag="x"
        dragConstraints={{ left: -rightActionWidth, right: leftActionWidth }}
        dragElastic={0.1}
        style={{ x }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Drag and Drop Reorderable List
 */
interface DraggableItemProps {
  id: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DraggableItem({
  id,
  index,
  moveItem,
  children,
  className,
  disabled = false,
}: DraggableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative touch-none",
        isDragging && "z-50 shadow-2xl",
        disabled && "opacity-50",
        className
      )}
      drag={!disabled ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
      layout
      layoutId={id}
    >
      <div className="flex items-center gap-2">
        {!disabled && (
          <div className="touch-none cursor-grab active:cursor-grabbing p-2">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </motion.div>
  );
}

/**
 * Sortable List Container
 */
interface SortableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function SortableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  className,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Bottom Sheet with Gesture Control
 */
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.5, 0.9],
  className,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(0);
  const y = useMotionValue(0);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      onClose();
    } else if (velocity < -500) {
      setCurrentSnap(Math.min(currentSnap + 1, snapPoints.length - 1));
    }
  };

  const sheetHeight = typeof window !== 'undefined' 
    ? window.innerHeight * snapPoints[currentSnap] 
    : 400;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={cn(
              "fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl z-50",
              "border-t border-border",
              className
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0, height: sheetHeight }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-6 pb-4 border-b border-border">
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: sheetHeight - 80 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Haptic Feedback Hook (for supported devices)
 */
export function useHapticFeedback() {
  const trigger = useCallback((type: "light" | "medium" | "heavy" = "light") => {
    if ("vibrate" in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  return { trigger };
}

/**
 * Long Press Hook
 */
interface UseLongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, onPress, delay = 500 }: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!isLongPress.current && onPress) {
      onPress();
    }
  }, [onPress]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}

/**
 * Pull Down Menu
 */
interface PullDownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PullDownMenu({ trigger, children, className }: PullDownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="absolute top-full left-0 right-0 mt-2 bg-background rounded-xl shadow-2xl border z-50 overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Touch Ripple Effect
 */
interface TouchRippleProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export function TouchRipple({ children, className, color = "rgba(255,255,255,0.3)" }: TouchRippleProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const addRipple = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = "touches" in event 
      ? event.touches[0].clientX - rect.left 
      : event.clientX - rect.left;
    const y = "touches" in event 
      ? event.touches[0].clientY - rect.top 
      : event.clientY - rect.top;

    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onTouchStart={addRipple}
      onMouseDown={addRipple}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              backgroundColor: color,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
            }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 40, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Swipe to Dismiss/Delete
 */
interface SwipeToDismissProps {
  children: React.ReactNode;
  onDismiss: () => void;
  direction?: "left" | "right" | "both";
  threshold?: number;
  className?: string;
  dismissContent?: React.ReactNode;
}

export function SwipeToDismiss({
  children,
  onDismiss,
  direction = "left",
  threshold = 150,
  className,
  dismissContent,
}: SwipeToDismissProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.9, 1, 0.9]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const shouldDismiss = 
      (direction === "left" && info.offset.x < -threshold) ||
      (direction === "right" && info.offset.x > threshold) ||
      (direction === "both" && Math.abs(info.offset.x) > threshold);

    if (shouldDismiss) {
      onDismiss();
    }
  };

  const dragConstraints = {
    left: direction === "right" ? 0 : -300,
    right: direction === "left" ? 0 : 300,
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background dismiss indicator */}
      <div className="absolute inset-0 flex items-center justify-between px-6 bg-danger-600">
        <Trash2 className="h-6 w-6 text-white" />
        {direction === "both" && <Trash2 className="h-6 w-6 text-white" />}
      </div>

      <motion.div
        className="relative bg-background"
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        style={{ x, opacity, scale }}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Expandable Card with Gesture
 */
interface ExpandableCardProps {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function ExpandableCard({
  header,
  children,
  defaultExpanded = false,
  className,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      className={cn(
        "bg-card rounded-xl border overflow-hidden",
        className
      )}
      layout
    >
      <motion.div
        className="p-4 flex items-center justify-between cursor-pointer active:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex-1">{header}</div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 border-t pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Quick Action Swipe
 */
export const swipeActionPresets = {
  delete: {
    icon: Trash2,
    label: "Delete",
    color: "text-white",
    bgColor: "bg-danger-600",
  },
  archive: {
    icon: Archive,
    label: "Archive",
    color: "text-white",
    bgColor: "bg-warning-600",
  },
  complete: {
    icon: Check,
    label: "Done",
    color: "text-white",
    bgColor: "bg-success-600",
  },
  pin: {
    icon: Pin,
    label: "Pin",
    color: "text-white",
    bgColor: "bg-primary",
  },
  star: {
    icon: Star,
    label: "Star",
    color: "text-white",
    bgColor: "bg-warning-500",
  },
};
