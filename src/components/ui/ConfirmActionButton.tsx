import React, { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ConfirmActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  onConfirm: () => Promise<void> | void;
  confirmText?: string;
  loadingText?: string;
  successText?: string;
  successDuration?: number;
  children: React.ReactNode;
}

/**
 * Button with built-in loading and success states
 * Shows visual feedback during async operations
 */
export function ConfirmActionButton({
  onConfirm,
  confirmText,
  loadingText = 'Processing...',
  successText = 'Done!',
  successDuration = 2000,
  children,
  disabled,
  className,
  ...props
}: ConfirmActionButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (state !== 'idle') return;

    setState('loading');

    try {
      await onConfirm();
      setState('success');

      // Auto-reset after success
      setTimeout(() => {
        setState('idle');
      }, successDuration);
    } catch (error) {
      setState('error');

      // Reset error state after a moment
      setTimeout(() => {
        setState('idle');
      }, 2000);
    }
  };

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || state !== 'idle'}
      className={cn(
        'relative overflow-hidden transition-all',
        state === 'success' && 'bg-green-600 hover:bg-green-700',
        state === 'error' && 'bg-red-600 hover:bg-red-700',
        className
      )}
    >
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {children}
          </motion.span>
        )}

        {state === 'loading' && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </motion.span>
        )}

        {state === 'success' && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            {successText}
          </motion.span>
        )}

        {state === 'error' && (
          <motion.span
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Failed
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

/**
 * Two-step confirmation button
 * Requires a second click to confirm the action
 */
export function TwoStepConfirmButton({
  onConfirm,
  confirmText = 'Click again to confirm',
  children,
  danger = false,
  ...props
}: Omit<ConfirmActionButtonProps, 'confirmText'> & {
  confirmText?: string;
  danger?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleFirstClick = () => {
    setConfirming(true);

    // Auto-reset after 3 seconds
    setTimeout(() => {
      setConfirming(false);
    }, 3000);
  };

  const handleConfirm = async () => {
    setState('loading');

    try {
      await onConfirm();
      setState('success');
      setTimeout(() => {
        setState('idle');
        setConfirming(false);
      }, 2000);
    } catch (error) {
      setState('idle');
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <Button
        {...props}
        onClick={handleFirstClick}
        variant={danger ? 'destructive' : props.variant}
      >
        {children}
      </Button>
    );
  }

  return (
    <ConfirmActionButton
      {...props}
      onConfirm={handleConfirm}
      variant={danger ? 'destructive' : props.variant}
      className={cn('animate-pulse', props.className)}
    >
      {confirmText}
    </ConfirmActionButton>
  );
}
