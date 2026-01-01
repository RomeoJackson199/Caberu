import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NetworkStatusProps {
  showOnlineStatus?: boolean;
  className?: string;
}

/**
 * Render a top-of-page network status banner that shows offline and brief reconnection notifications.
 *
 * Subscribes to window `online`/`offline` events to track connectivity, shows an offline banner with a retry button when disconnected,
 * and briefly shows a "You're back online!" banner after reconnection. Event listeners are cleaned up on unmount.
 *
 * @param showOnlineStatus - When `true`, show the online banner state even if currently online; defaults to `false`.
 * @param className - Optional additional CSS classes applied to the banner container.
 * @returns A React element displaying the network status banner, or `null` when nothing should be rendered.
 */
export function NetworkStatus({ showOnlineStatus = false, className }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  // Show nothing if online and not showing online status
  if (isOnline && !showOnlineStatus && !showReconnected) {
    return null;
  }

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white px-4 py-2 shadow-lg",
            className
          )}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5" />
              <div>
                <p className="font-medium">You're offline</p>
                <p className="text-sm text-orange-100">Some features may not work properly. Check your connection.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-white hover:bg-orange-600"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white px-4 py-2 shadow-lg",
            className
          )}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Wifi className="h-5 w-5" />
            <p className="font-medium">You're back online!</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Renders a compact inline network connectivity indicator.
 *
 * @param className - Optional additional CSS classes applied to the root container
 * @returns A small inline element showing "Connected" with a green cloud icon when the browser is online, or "Offline" with an orange cloud-off icon when the browser is offline.
 */
export function NetworkIndicator({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {isOnline ? (
        <>
          <Cloud className="h-4 w-4 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Connected</span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 text-orange-500" />
          <span className="text-orange-600 dark:text-orange-400">Offline</span>
        </>
      )}
    </div>
  );
}

// Syncing indicator for data operations
interface SyncingIndicatorProps {
  isSyncing?: boolean;
  lastSyncedAt?: Date | null;
  error?: boolean;
  className?: string;
}

/**
 * Render a compact sync status indicator reflecting error, active syncing, or time since last successful sync.
 *
 * Displays exactly one state in priority order: error, syncing, then last-synced timestamp. Returns nothing when no status is applicable.
 *
 * @param isSyncing - When true, shows a "Saving..." syncing indicator.
 * @param lastSyncedAt - Timestamp of the last successful sync; when provided (and not syncing or error) shows "Saved X ago".
 * @param error - When true, shows a "Sync failed" error indicator.
 * @param className - Optional additional CSS class names applied to the root element.
 * @returns A JSX element representing the current sync status, or `null` when there is no status to show.
 */
export function SyncingIndicator({ isSyncing, lastSyncedAt, error, className }: SyncingIndicatorProps) {
  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-red-600 dark:text-red-400", className)}>
        <CloudOff className="h-4 w-4" />
        <span>Sync failed</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400", className)}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (lastSyncedAt) {
    const timeAgo = formatTimeAgo(lastSyncedAt);
    return (
      <div className={cn("flex items-center gap-2 text-sm text-green-600 dark:text-green-400", className)}>
        <Cloud className="h-4 w-4" />
        <span>Saved {timeAgo}</span>
      </div>
    );
  }

  return null;
}

/**
 * Produces a concise human-readable description of how long ago a date occurred.
 *
 * @param date - The past date to describe relative to now.
 * @returns A string describing the elapsed time: "just now" if under 60s, "{n}m ago" if under 1h, "{n}h ago" if under 1d, or "{n}d ago" otherwise.
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}