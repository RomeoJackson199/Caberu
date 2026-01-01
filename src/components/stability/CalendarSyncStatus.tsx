import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, CheckCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CalendarSyncStatusProps {
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
  syncError?: Error | null;
  onSync?: () => void;
  className?: string;
}

export function CalendarSyncStatus({
  lastSyncTime,
  isSyncing = false,
  syncError = null,
  onSync,
  className
}: CalendarSyncStatusProps) {
  const [displayTime, setDisplayTime] = useState('');

  useEffect(() => {
    if (!lastSyncTime) {
      setDisplayTime('Never synced');
      return;
    }

    const updateDisplayTime = () => {
      setDisplayTime(formatDistanceToNow(lastSyncTime, { addSuffix: true }));
    };

    // Update immediately
    updateDisplayTime();

    // Update every minute
    const interval = setInterval(updateDisplayTime, 60000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const getStatus = () => {
    if (isSyncing) {
      return {
        icon: RefreshCw,
        text: 'Syncing...',
        variant: 'default' as const,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
    }

    if (syncError) {
      return {
        icon: AlertCircle,
        text: 'Sync failed',
        variant: 'destructive' as const,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    }

    if (lastSyncTime) {
      return {
        icon: CheckCircle,
        text: 'Synced',
        variant: 'default' as const,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    }

    return {
      icon: Clock,
      text: 'Not synced',
      variant: 'secondary' as const,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950/30',
      borderColor: 'border-gray-200 dark:border-gray-800'
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  const tooltipContent = syncError
    ? `Sync failed: ${syncError.message}`
    : lastSyncTime
    ? `Last synced ${displayTime}`
    : 'Google Calendar not synced yet';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn('inline-flex items-center gap-2', className)}
          >
            <Badge
              variant={status.variant}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all',
                status.bgColor,
                status.borderColor,
                'border'
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  status.color,
                  isSyncing && 'animate-spin'
                )}
              />
              <Calendar className={cn('h-3.5 w-3.5', status.color)} />
              <span className={status.color}>{status.text}</span>
            </Badge>

            {onSync && !isSyncing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSync();
                }}
                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{tooltipContent}</p>
            {syncError && (
              <p className="text-xs text-muted-foreground">
                Click sync to try again
              </p>
            )}
            {lastSyncTime && !syncError && (
              <p className="text-xs text-muted-foreground">
                Syncs automatically every 5 minutes
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version for toolbars and headers
 */
export function CalendarSyncStatusCompact(props: CalendarSyncStatusProps) {
  const status = props.syncError
    ? { icon: AlertCircle, color: 'text-red-500' }
    : props.isSyncing
    ? { icon: RefreshCw, color: 'text-blue-500' }
    : props.lastSyncTime
    ? { icon: CheckCircle, color: 'text-green-500' }
    : { icon: Clock, color: 'text-gray-500' };

  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={props.onSync}
            disabled={props.isSyncing}
            className={cn(
              'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              props.className
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                status.color,
                props.isSyncing && 'animate-spin'
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {props.syncError
              ? 'Calendar sync failed - click to retry'
              : props.isSyncing
              ? 'Syncing with Google Calendar...'
              : props.lastSyncTime
              ? `Synced ${formatDistanceToNow(props.lastSyncTime, { addSuffix: true })}`
              : 'Click to sync with Google Calendar'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
