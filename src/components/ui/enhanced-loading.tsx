import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

export interface LoadingStateProps {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  message?: string;
  className?: string;
}

/**
 * Enhanced loading indicator with success/error states
 * Provides visual feedback for async operations
 */
export function LoadingState({
  loading = false,
  success = false,
  error = false,
  message,
  className,
}: LoadingStateProps) {
  return (
    <AnimatePresence mode="wait">
      {(loading || success || error) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn('flex items-center gap-3 p-4', className)}
        >
          {loading && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm text-muted-foreground">
                {message || 'Loading...'}
              </span>
            </>
          )}
          {success && (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-600">
                {message || 'Success!'}
              </span>
            </>
          )}
          {error && (
            <>
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-600">
                {message || 'An error occurred'}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface OperationFeedbackProps {
  state: 'idle' | 'loading' | 'success' | 'error';
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  showDuration?: number; // How long to show success/error (ms)
  onComplete?: () => void;
}

/**
 * Stateful operation feedback component
 * Automatically transitions through states and can auto-hide
 */
export function OperationFeedback({
  state,
  loadingMessage = 'Processing...',
  successMessage = 'Completed successfully',
  errorMessage = 'Operation failed',
  showDuration = 3000,
  onComplete,
}: OperationFeedbackProps) {
  React.useEffect(() => {
    if ((state === 'success' || state === 'error') && showDuration > 0) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, showDuration);
      return () => clearTimeout(timer);
    }
  }, [state, showDuration, onComplete]);

  if (state === 'idle') {
    return null;
  }

  return (
    <LoadingState
      loading={state === 'loading'}
      success={state === 'success'}
      error={state === 'error'}
      message={
        state === 'loading'
          ? loadingMessage
          : state === 'success'
          ? successMessage
          : errorMessage
      }
    />
  );
}

export interface InlineSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

/**
 * Simple inline spinner for buttons and compact spaces
 */
export function InlineSpinner({ size = 'sm', text, className }: InlineSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}

export interface SkeletonCardProps {
  title?: boolean;
  description?: boolean;
  actions?: number;
  className?: string;
}

/**
 * Skeleton card for loading states
 */
export function SkeletonCard({
  title = true,
  description = true,
  actions = 0,
  className,
}: SkeletonCardProps) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-6 space-y-4">
        {title && <div className="h-6 bg-muted rounded w-3/4" />}
        {description && <div className="h-4 bg-muted rounded w-full" />}
        {description && <div className="h-4 bg-muted rounded w-5/6" />}
        {actions > 0 && (
          <div className="flex gap-2 pt-4">
            {Array.from({ length: actions }).map((_, i) => (
              <div key={i} className="h-9 bg-muted rounded w-24" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

/**
 * Progress indicator for multi-step operations
 */
export function ProgressIndicator({
  current,
  total,
  label,
  showPercentage = true,
  className,
}: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-medium text-blue-600">{percentage}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i < current
                  ? 'w-8 bg-blue-600'
                  : i === current
                  ? 'w-12 bg-blue-400'
                  : 'w-6 bg-muted'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface TimeEstimateProps {
  estimatedSeconds: number;
  elapsedSeconds?: number;
  className?: string;
}

/**
 * Shows estimated time remaining for operations
 */
export function TimeEstimate({
  estimatedSeconds,
  elapsedSeconds = 0,
  className,
}: TimeEstimateProps) {
  const remaining = Math.max(0, estimatedSeconds - elapsedSeconds);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Clock className="h-4 w-4" />
      <span>
        {minutes > 0 ? `${minutes}m ` : ''}
        {seconds}s remaining
      </span>
    </div>
  );
}
