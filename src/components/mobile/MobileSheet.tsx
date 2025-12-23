import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useCallback, ReactNode } from "react";

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  snapPoints?: number[];
  defaultSnapPoint?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
}

export function MobileSheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  snapPoints = [0.5, 0.9],
  defaultSnapPoint = 0,
  showHandle = true,
  showCloseButton = true,
  className,
  contentClassName,
}: MobileSheetProps) {
  const y = useMotionValue(0);
  
  // Calculate the current snap point height
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const currentSnapHeight = windowHeight * snapPoints[defaultSnapPoint];
  
  const opacity = useTransform(y, [0, currentSnapHeight], [1, 0]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;
    
    // Close if dragged down past threshold or with high velocity
    if (offset > currentSnapHeight * 0.3 || velocity > 500) {
      onClose();
    }
  }, [currentSnapHeight, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ opacity }}
          />

          {/* Sheet */}
          <motion.div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-background border-t border-border",
              "rounded-t-3xl shadow-2xl",
              "safe-area-inset-bottom",
              className
            )}
            style={{ 
              height: `${snapPoints[snapPoints.length - 1] * 100}vh`,
              y 
            }}
            initial={{ y: "100%" }}
            animate={{ y: `${(1 - snapPoints[defaultSnapPoint]) * 100}%` }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between px-6 py-4 border-b border-border">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <motion.button
                    className="p-2 -mr-2 rounded-full hover:bg-muted"
                    onClick={onClose}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                )}
              </div>
            )}

            {/* Content */}
            <div 
              className={cn(
                "flex-1 overflow-auto overscroll-contain",
                "px-6 py-4",
                contentClassName
              )}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  className?: string;
}

export function MobileModal({
  isOpen,
  onClose,
  children,
  title,
  description,
  showCloseButton = true,
  className,
}: MobileModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={cn(
              "fixed z-50 inset-4 m-auto",
              "max-w-lg max-h-[80vh]",
              "bg-background border border-border",
              "rounded-2xl shadow-2xl overflow-hidden",
              "flex flex-col",
              className
            )}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between p-6 border-b border-border">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <motion.button
                    className="p-2 -mr-2 rounded-full hover:bg-muted"
                    onClick={onClose}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface MobileToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function MobileToast({
  message,
  type = "info",
  isVisible,
  onDismiss,
  duration = 3000,
  action,
}: MobileToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  const typeStyles = {
    success: "bg-success text-success-foreground",
    error: "bg-destructive text-destructive-foreground",
    warning: "bg-warning text-warning-foreground",
    info: "bg-primary text-primary-foreground",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            "fixed bottom-20 left-4 right-4 z-50",
            "flex items-center justify-between gap-4",
            "px-4 py-3 rounded-xl shadow-lg",
            "safe-area-inset-bottom",
            typeStyles[type]
          )}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          drag="x"
          dragConstraints={{ left: -100, right: 100 }}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 100) {
              onDismiss();
            }
          }}
        >
          <p className="text-sm font-medium flex-1">{message}</p>
          {action && (
            <button
              className="text-sm font-semibold underline-offset-2 hover:underline"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
