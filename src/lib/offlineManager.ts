import { logger } from './logger';
import { toast } from '@/hooks/use-toast';

export type ConnectionStatus = 'online' | 'offline' | 'slow';

export interface OfflineQueueItem {
  id: string;
  operation: () => Promise<any>;
  operationName: string;
  timestamp: number;
  retries: number;
}

/**
 * Manages offline detection and queued operations
 * Automatically retries failed operations when connection is restored
 */
export class OfflineManager {
  private static instance: OfflineManager;
  private status: ConnectionStatus = 'online';
  private queue: OfflineQueueItem[] = [];
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;

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
    // Listen to browser online/offline events
    window.addEventListener('online', this.boundHandleOnline);
    window.addEventListener('offline', this.boundHandleOffline);

    // Check initial status
    this.updateStatus(navigator.onLine ? 'online' : 'offline');

    // Periodic connection quality check
    this.startConnectionMonitoring();

    // Clean up on page unload to prevent memory leaks
    window.addEventListener('beforeunload', () => {
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
      // Try to fetch a small resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - start;

      // Consider connection slow if latency > 2000ms
      if (latency > 2000) {
        this.updateStatus('slow');
      } else if (this.status === 'slow') {
        this.updateStatus('online');
      }
    } catch (error) {
      // Network is likely offline
      this.updateStatus('offline');
    }
  }

  private handleOnline() {
    logger.info('Network connection restored');
    this.updateStatus('online');

    toast({
      title: 'Back Online',
      description: 'Connection restored. Syncing pending changes...',
      duration: 3000,
    });

    // Process queued operations
    this.processQueue();
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
   * Subscribe to connection status changes
   */
  subscribe(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
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
   * Add an operation to the offline queue
   */
  queueOperation(operationName: string, operation: () => Promise<any>): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item: OfflineQueueItem = {
      id,
      operation,
      operationName,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(item);
    logger.info(`Queued operation: ${operationName} (ID: ${id})`);

    // Try to process immediately if online
    if (this.isOnline()) {
      this.processQueue();
    }

    return id;
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
   * Clear all queued operations
   */
  clearQueue() {
    this.queue = [];
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
