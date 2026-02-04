import { useState, useEffect } from 'react';
import { offlineManager, ConnectionStatus } from '@/lib/offlineManager';

/**
 * Exposes current connection status, derived flags, the offline queue size, and a function to enqueue operations for offline processing.
 *
 * @returns An object with:
 * - `status`: the current connection status.
 * - `isOnline`: `true` when `status` is not `'offline'`.
 * - `isOffline`: `true` when `status` is `'offline'`.
 * - `isSlow`: `true` when `status` is `'slow'`.
 * - `queueSize`: the current number of operations waiting in the offline queue.
 * - `queueOperation`: a function that enqueues an operation by name. It accepts `(operationName, operation, serializedData?)` where `operation` is an async function to run when processing the queue and `serializedData` is optional data associated with the operation; the function returns whatever the queueing mechanism returns.
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