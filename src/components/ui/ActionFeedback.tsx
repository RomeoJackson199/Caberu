import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedbackType = 'success' | 'error' | 'loading' | 'info';

export interface ActionFeedbackProps {
  type: FeedbackType;
  message: string;
  description?: string;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

/**
 * Animated action feedback component for displaying operation status
 * Automatically dismisses after duration (if provided)
 */
export function ActionFeedback({
  type,
  message,
  description,
  duration,
  onComplete,
  className,
}: ActionFeedbackProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration && type !== 'loading') {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          onComplete?.();
        }, 300); // Wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, type, onComplete]);

  const config = {
    success: {
      icon: CheckCircle2,
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-900 dark:text-green-100',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-900 dark:text-red-100',
    },
    loading: {
      icon: Loader2,
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-900 dark:text-blue-100',
    },
    info: {
      icon: Info,
      bgColor: 'bg-gray-50 dark:bg-gray-950/30',
      borderColor: 'border-gray-200 dark:border-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      textColor: 'text-gray-900 dark:text-gray-100',
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor, textColor } = config[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg border-2',
            bgColor,
            borderColor,
            className
          )}
        >
          <div className={cn('flex-shrink-0 mt-0.5', iconColor)}>
            <Icon
              className={cn('h-5 w-5', type === 'loading' && 'animate-spin')}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('font-semibold text-sm', textColor)}>{message}</p>
            {description && (
              <p className={cn('text-sm mt-1 opacity-80', textColor)}>
                {description}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Toast-style floating feedback at the top of the viewport
 */
export function FloatingFeedback({
  type,
  message,
  description,
  duration = 3000,
  onComplete,
}: ActionFeedbackProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
      <ActionFeedback
        type={type}
        message={message}
        description={description}
        duration={duration}
        onComplete={onComplete}
        className="shadow-lg"
      />
    </div>
  );
}

/**
 * Hook for managing action feedback state
 */
export function useActionFeedback() {
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message: string;
    description?: string;
  } | null>(null);

  const showFeedback = (
    type: FeedbackType,
    message: string,
    description?: string
  ) => {
    setFeedback({ type, message, description });
  };

  const success = (message: string, description?: string) => {
    showFeedback('success', message, description);
  };

  const error = (message: string, description?: string) => {
    showFeedback('error', message, description);
  };

  const loading = (message: string, description?: string) => {
    showFeedback('loading', message, description);
  };

  const info = (message: string, description?: string) => {
    showFeedback('info', message, description);
  };

  const clear = () => {
    setFeedback(null);
  };

  return {
    feedback,
    showFeedback,
    success,
    error,
    loading,
    info,
    clear,
  };
}
