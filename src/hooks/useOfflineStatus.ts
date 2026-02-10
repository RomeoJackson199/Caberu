import { useState, useEffect } from 'react';
import { offlineManager, ConnectionStatus } from '@/lib/offlineManager';

/**
 * Hook to track online/offline status
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

  return {
    status,
    isOnline: status !== 'offline',
    isOffline: status === 'offline',
    isSlow: status === 'slow',
    queueSize,
    queueOperation: (
      operationName: string,
      operation: () => Promise<any>,
      serializedData?: Parameters<typeof offlineManager.queueOperation>[2]
    ) => offlineManager.queueOperation(operationName, operation, serializedData),
  };
}
