import React, { ReactNode } from 'react';
import { WifiOff, Clock, RefreshCw, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OfflineAwareContainerProps {
  children: ReactNode;
  /** Content to show when offline and no cached data is available */
  offlineFallback?: ReactNode;
  /** If true, children are always rendered (with an offline banner). If false, fallback replaces children when offline. */
  showChildrenWhenOffline?: boolean;
  /** Feature name shown in the offline message */
  featureName?: string;
  className?: string;
}

/**
 * Wraps page content with offline-aware behavior.
 * When offline, shows a contextual banner or replaces content with an offline state.
 */
export function OfflineAwareContainer({
  children,
  offlineFallback,
  showChildrenWhenOffline = true,
  featureName = 'This feature',
  className,
}: OfflineAwareContainerProps) {
  const { isOffline, isSlow, queueSize, getQueueItems } = useOfflineStatus();

  if (isOffline && !showChildrenWhenOffline) {
    return (
      <div className={cn('flex flex-col items-center justify-center min-h-[300px] p-8', className)}>
        {offlineFallback || (
          <DefaultOfflineFallback featureName={featureName} queueSize={queueSize} />
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
              <div className="flex items-start gap-3">
                <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    You're viewing cached data
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {featureName} is showing previously loaded data. Changes will sync when you're back online.
                  </p>
                  {queueSize > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 dark:text-amber-300">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>{queueSize} {queueSize === 1 ? 'change' : 'changes'} waiting to sync</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isSlow && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Slow connection detected. Data may load slower than usual.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
}

function DefaultOfflineFallback({
  featureName,
  queueSize,
}: {
  featureName: string;
  queueSize: number;
}) {
  return (
    <div className="text-center space-y-4 max-w-sm">
      <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Database className="h-8 w-8 text-slate-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {featureName} requires a connection
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This content isn't available offline. Please check your connection and try again.
        </p>
      </div>
      {queueSize > 0 && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          {queueSize} pending {queueSize === 1 ? 'change' : 'changes'}
        </div>
      )}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}
