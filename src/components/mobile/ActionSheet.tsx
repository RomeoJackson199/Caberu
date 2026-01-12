import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/use-haptics';

export interface ActionSheetAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'primary';
  disabled?: boolean;
  onSelect: () => void;
}

export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
  showCancel?: boolean;
  className?: string;
}

export const ActionSheet = ({
  isOpen,
  onClose,
  title,
  message,
  actions,
  cancelLabel = 'Cancel',
  showCancel = true,
  className,
}: ActionSheetProps) => {
  const haptics = useHaptics();

  const handleActionSelect = useCallback(
    (action: ActionSheetAction) => {
      if (action.disabled) return;

      haptics.selection();
      action.onSelect();
      onClose();
    },
    [haptics, onClose]
  );

  const handleCancel = useCallback(() => {
    haptics.impact.light();
    onClose();
  }, [haptics, onClose]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        handleCancel();
      }
    },
    [handleCancel]
  );

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />

          {/* Action Sheet */}
          <motion.div
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[9999] max-w-lg mx-auto',
              className
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Safe area for iOS */}
            <div className="pb-[env(safe-area-inset-bottom)]">
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-gray-400/50 rounded-full" />
              </div>

              {/* Main actions */}
              <div className="px-3 pb-2">
                <div className="backdrop-blur-2xl bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                  {/* Header */}
                  {(title || message) && (
                    <div className="px-4 py-4 text-center border-b border-gray-200/50 dark:border-gray-700/50">
                      {title && (
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                          {title}
                        </h3>
                      )}
                      {message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {actions.map((action, index) => (
                    <motion.button
                      key={action.id}
                      className={cn(
                        'w-full px-4 py-4 flex items-center justify-center gap-3 text-base font-medium transition-colors',
                        'border-b border-gray-200/50 dark:border-gray-700/50 last:border-b-0',
                        action.variant === 'destructive' &&
                          'text-red-600 dark:text-red-400',
                        action.variant === 'primary' &&
                          'text-blue-600 dark:text-blue-400 font-semibold',
                        action.variant === 'default' &&
                          'text-gray-900 dark:text-gray-100',
                        action.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'active:bg-gray-100/50 dark:active:bg-gray-800/50'
                      )}
                      onClick={() => handleActionSelect(action)}
                      disabled={action.disabled}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileTap={action.disabled ? {} : { scale: 0.98 }}
                    >
                      {action.icon && (
                        <span className="w-5 h-5 flex items-center justify-center">
                          {action.icon}
                        </span>
                      )}
                      <span>{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cancel button */}
              {showCancel && (
                <div className="px-3 pb-3">
                  <motion.button
                    className="w-full px-4 py-4 backdrop-blur-2xl bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-white/20 shadow-2xl text-base font-semibold text-gray-900 dark:text-gray-100 active:bg-gray-100/50 dark:active:bg-gray-800/50 transition-colors"
                    onClick={handleCancel}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: actions.length * 0.03 + 0.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {cancelLabel}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ActionSheet;
