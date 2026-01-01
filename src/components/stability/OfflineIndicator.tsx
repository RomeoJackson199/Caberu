import React from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
  compact?: boolean;
}

/**
 * Displays connection status and pending sync operations
 */
export function OfflineIndicator({
  className,
  showWhenOnline = false,
  compact = false,
}: OfflineIndicatorProps) {
  const { status, queueSize } = useOfflineStatus();

  const shouldShow = status !== 'online' || (showWhenOnline && queueSize > 0);

  if (!shouldShow && !showWhenOnline) {
    return null;
  }

  if (compact) {
    return (
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
              status === 'offline'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : status === 'slow'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
              className
            )}
          >
            {status === 'offline' ? (
              <WifiOff className="h-3 w-3" />
            ) : status === 'slow' ? (
              <CloudOff className="h-3 w-3" />
            ) : (
              <Wifi className="h-3 w-3" />
            )}
            <span>
              {status === 'offline'
                ? 'Offline'
                : status === 'slow'
                ? 'Slow Connection'
                : 'Online'}
            </span>
            {queueSize > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/50 dark:bg-black/20 rounded-full text-xs">
                {queueSize}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={className}
        >
          <Alert
            variant={status === 'offline' ? 'destructive' : 'default'}
            className={cn(
              'border-2',
              status === 'offline'
                ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                : status === 'slow'
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
                : 'border-green-500 bg-green-50 dark:bg-green-950/30'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex-shrink-0 p-2 rounded-full',
                  status === 'offline'
                    ? 'bg-red-100 dark:bg-red-900/50'
                    : status === 'slow'
                    ? 'bg-yellow-100 dark:bg-yellow-900/50'
                    : 'bg-green-100 dark:bg-green-900/50'
                )}
              >
                {status === 'offline' ? (
                  <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : status === 'slow' ? (
                  <CloudOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <AlertDescription className="flex-1">
                <div className="space-y-1">
                  <p className="font-semibold">
                    {status === 'offline'
                      ? 'You are offline'
                      : status === 'slow'
                      ? 'Slow connection detected'
                      : 'Connection restored'}
                  </p>
                  <p className="text-sm">
                    {status === 'offline'
                      ? 'Changes will be saved when you reconnect.'
                      : status === 'slow'
                      ? 'Some operations may be slower than usual.'
                      : 'All pending changes have been synced.'}
                  </p>
                  {queueSize > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>
                        {queueSize} {queueSize === 1 ? 'change' : 'changes'} pending sync
                      </span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Floating offline banner that appears at the top of the screen
 */
export function OfflineBanner() {
  const { isOffline, queueSize } = useOfflineStatus();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOff className="h-5 w-5" />
                <div>
                  <p className="font-semibold">No internet connection</p>
                  <p className="text-sm opacity-90">
                    You're working offline. Changes will sync when reconnected.
                  </p>
                </div>
              </div>
              {queueSize > 0 && (
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {queueSize} pending
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
