import { useState, useEffect, useCallback } from 'react';
import { offlineManager, ConnectionStatus } from '@/lib/offlineManager';

/**
 * Hook to track online/offline status with queue details
 */
export function useOfflineStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(offlineManager.getStatus());
  const [queueSize, setQueueSize] = useState(offlineManager.getQueueSize());

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((newStatus) => {
      setStatus(newStatus);
      setQueueSize(offlineManager.getQueueSize());
    });

    // Update queue size periodically
    const interval = setInterval(() => {
      setQueueSize(offlineManager.getQueueSize());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getOfflineDuration = useCallback(() => {
    return offlineManager.getOfflineDuration();
  }, []);

  const getQueueItems = useCallback(() => {
    return offlineManager.getQueueItems();
  }, []);

  return {
    status,
    isOnline: status !== 'offline',
    isOffline: status === 'offline',
    isSlow: status === 'slow',
    queueSize,
    queueOperation: offlineManager.queueOperation.bind(offlineManager),
    getOfflineDuration,
    getQueueItems,
  };
}
