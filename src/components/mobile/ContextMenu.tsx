import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/use-haptics';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ContextMenuProps {
  children: React.ReactNode;
  items: ContextMenuItem[];
  className?: string;
  disabled?: boolean;
  longPressDuration?: number;
}

export const ContextMenu = ({
  children,
  items,
  className,
  disabled = false,
  longPressDuration = 500,
}: ContextMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [previewScale, setPreviewScale] = useState(1);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const haptics = useHaptics();

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      setPosition({ x: touch.clientX, y: touch.clientY });

      // Start scale animation
      setPreviewScale(0.95);

      // Start long press timer
      timeoutRef.current = setTimeout(() => {
        setIsOpen(true);
        haptics.impact.medium();
        setPreviewScale(1);
      }, longPressDuration);
    },
    [disabled, longPressDuration, haptics]
  );

  const handleTouchEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      setPreviewScale(1);
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      setPreviewScale(1);
    }
  }, []);

  const handleItemSelect = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;

      haptics.selection();
      item.onSelect();
      setIsOpen(false);
    },
    [haptics]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  return (
    <>
      <motion.div
        ref={triggerRef}
        className={cn('relative', className)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        animate={{ scale: previewScale }}
        transition={{ type: 'spring', damping: 20, stiffness: 400 }}
      >
        {children}
      </motion.div>

      {isOpen &&
        createPortal(
          <AnimatePresence>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />

            {/* Context Menu */}
            <motion.div
              className="fixed z-[9999] min-w-[250px]"
              style={{
                left: Math.min(position.x, window.innerWidth - 260),
                top: Math.min(position.y, window.innerHeight - items.length * 56 - 20),
              }}
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            >
              <div className="backdrop-blur-2xl bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                {items.map((item, index) => (
                  <motion.button
                    key={item.id}
                    className={cn(
                      'w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors',
                      'border-b border-gray-200/50 dark:border-gray-700/50 last:border-b-0',
                      item.destructive
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-gray-100',
                      item.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'active:bg-gray-100/50 dark:active:bg-gray-800/50'
                    )}
                    onClick={() => handleItemSelect(item)}
                    disabled={item.disabled}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileTap={item.disabled ? {} : { scale: 0.98 }}
                  >
                    {item.icon && (
                      <span className="w-5 h-5 flex items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <span className="font-medium">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default ContextMenu;
