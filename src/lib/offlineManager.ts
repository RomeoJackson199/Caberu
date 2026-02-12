import { logger } from './logger';
import { toast } from '@/hooks/use-toast';

export type ConnectionStatus = 'online' | 'offline' | 'slow';

export interface OfflineQueueItem {
  id: string;
  operation: () => Promise<unknown>;
  operationName: string;
  timestamp: number;
  retries: number;
}

interface SerializedQueueItem {
  id: string;
  operationName: string;
  timestamp: number;
  retries: number;
}

const QUEUE_STORAGE_KEY = 'caberu-offline-queue';
const LAST_ONLINE_KEY = 'caberu-last-online';

/**
 * Manages offline detection and queued operations.
 * Persists queue metadata to localStorage so pending operation counts
 * survive page refreshes. Actual operation callbacks are held in memory.
 */
export class OfflineManager {
  private static instance: OfflineManager;
  private status: ConnectionStatus = 'online';
  private queue: OfflineQueueItem[] = [];
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastOnlineTimestamp: number = Date.now();

  private constructor() {
    this.initialize();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  // Bound methods for event listeners
  private boundHandleOnline = () => this.handleOnline();
  private boundHandleOffline = () => this.handleOffline();

  private initialize() {
    // Restore last online timestamp
    try {
      const stored = localStorage.getItem(LAST_ONLINE_KEY);
      if (stored) {
        this.lastOnlineTimestamp = parseInt(stored, 10);
      }
    } catch {
      // localStorage may be unavailable
    }

    // Listen to browser online/offline events
    window.addEventListener('online', this.boundHandleOnline);
    window.addEventListener('offline', this.boundHandleOffline);

    // Listen for service worker messages to process queue
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PROCESS_OFFLINE_QUEUE') {
          this.processQueue();
        }
      });
    }

    // Check initial status
    this.updateStatus(navigator.onLine ? 'online' : 'offline');

    // Periodic connection quality check
    this.startConnectionMonitoring();

    // Clean up on page unload to prevent memory leaks
    window.addEventListener('beforeunload', () => {
      this.persistQueue();
      this.destroy();
    });
  }

  private startConnectionMonitoring() {
    // Check connection quality every 30 seconds when online
    this.checkInterval = setInterval(() => {
      if (this.status !== 'offline') {
        this.checkConnectionQuality();
      }
    }, 30000);
  }

  private async checkConnectionQuality() {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Ping our own origin instead of an external domain.
      // This is more reliable in environments that block third-party requests
      // and accurately reflects whether our own server is reachable.
      await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - start;

      if (latency > 2000) {
        this.updateStatus('slow');
      } else if (this.status === 'slow') {
        this.updateStatus('online');
      }
    } catch {
      // If our own server is unreachable, check navigator.onLine as a fallback
      // to distinguish between server-down and truly-offline scenarios
      if (!navigator.onLine) {
        this.updateStatus('offline');
      }
    }
  }

  private handleOnline() {
    logger.info('Network connection restored');
    this.updateStatus('online');
    this.lastOnlineTimestamp = Date.now();

    try {
      localStorage.setItem(LAST_ONLINE_KEY, this.lastOnlineTimestamp.toString());
    } catch {
      // ignore
    }

    toast({
      title: 'Back Online',
      description: 'Connection restored. Syncing pending changes...',
      duration: 3000,
    });

    // Process queued operations
    this.processQueue();

    // Request background sync if available
    this.requestBackgroundSync();
  }

  private handleOffline() {
    logger.warn('Network connection lost');
    this.updateStatus('offline');

    toast({
      title: 'Connection Lost',
      description: 'You are offline. Changes will be saved when connection is restored.',
      variant: 'destructive',
      duration: 5000,
    });
  }

  private updateStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  /**
   * Request a background sync via the service worker
   */
  private async requestBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-offline-queue');
      } catch {
        // Background sync not available, will use regular queue processing
      }
    }
  }

  /**
   * Tell the service worker to clear its API cache (e.g. on logout)
   */
  clearApiCache() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHE' });
    }
  }

  /**
   * Subscribe to connection status changes
   */
  subscribe(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.status !== 'offline';
  }

  /**
   * Get duration since last known online state
   */
  getOfflineDuration(): number | null {
    if (this.status !== 'offline') return null;
    return Date.now() - this.lastOnlineTimestamp;
  }

  /**
   * Add an operation to the offline queue
   */
  queueOperation(operationName: string, operation: () => Promise<unknown>): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item: OfflineQueueItem = {
      id,
      operation,
      operationName,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(item);
    this.persistQueue();
    logger.info(`Queued operation: ${operationName} (ID: ${id})`);

    // Try to process immediately if online
    if (this.isOnline()) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Remove a specific operation from the queue
   */
  removeOperation(id: string) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.persistQueue();
  }

  /**
   * Process all queued operations
   */
  private async processQueue() {
    if (this.queue.length === 0) {
      return;
    }

    logger.info(`Processing ${this.queue.length} queued operations`);

    const toProcess = [...this.queue];
    this.queue = [];

    for (const item of toProcess) {
      try {
        await item.operation();
        logger.info(`Successfully processed queued operation: ${item.operationName}`);
      } catch (error) {
        logger.error(`Failed to process queued operation: ${item.operationName}`, error);

        // Re-queue with retry limit
        if (item.retries < 3) {
          this.queue.push({
            ...item,
            retries: item.retries + 1,
          });
        } else {
          logger.error(`Dropping operation after 3 retries: ${item.operationName}`);

          toast({
            title: 'Sync Failed',
            description: `Unable to sync: ${item.operationName}. Please try again manually.`,
            variant: 'destructive',
          });
        }
      }
    }

    this.persistQueue();

    if (this.queue.length > 0) {
      logger.info(`${this.queue.length} operations remain in queue`);
    } else {
      toast({
        title: 'Sync Complete',
        description: 'All pending changes have been synced.',
        duration: 2000,
      });
    }
  }

  /**
   * Get number of queued operations
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get serialized queue items (without callbacks) for display
   */
  getQueueItems(): SerializedQueueItem[] {
    return this.queue.map(({ id, operationName, timestamp, retries }) => ({
      id,
      operationName,
      timestamp,
      retries,
    }));
  }

  /**
   * Persist queue metadata to localStorage.
   * Only names/timestamps are stored since function callbacks can't be serialized.
   */
  private persistQueue() {
    try {
      const serialized: SerializedQueueItem[] = this.queue.map(
        ({ id, operationName, timestamp, retries }) => ({
          id,
          operationName,
          timestamp,
          retries,
        })
      );
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(serialized));
    } catch {
      // localStorage may be full or unavailable
    }
  }

  /**
   * Get the persisted queue size (useful on fresh page load to show pending count)
   */
  static getPersistedQueueSize(): number {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as SerializedQueueItem[];
        return items.length;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  /**
   * Clear persisted queue (e.g., after successful full sync)
   */
  static clearPersistedQueue() {
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Clear all queued operations
   */
  clearQueue() {
    this.queue = [];
    this.persistQueue();
    logger.info('Offline queue cleared');
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    window.removeEventListener('online', this.boundHandleOnline);
    window.removeEventListener('offline', this.boundHandleOffline);
    this.listeners.clear();
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance();
