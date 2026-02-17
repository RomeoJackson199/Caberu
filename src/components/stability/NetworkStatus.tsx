import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NetworkStatusProps {
  showOnlineStatus?: boolean;
  className?: string;
}

export function NetworkStatus({ showOnlineStatus = false, className }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setShowReconnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setShowReconnected(false);
        }, 3000);
        wasOfflineRef.current = false;
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

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

// Inline network indicator for forms and critical sections
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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
