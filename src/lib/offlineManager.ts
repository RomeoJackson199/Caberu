import { logger } from './logger';
import { toast } from '@/hooks/use-toast';

export type ConnectionStatus = 'online' | 'offline' | 'slow';

export interface OfflineQueueItem {
  id: string;
  operation: () => Promise<any>;
  operationName: string;
  timestamp: number;
  retries: number;
  // Serializable data for persistence
  serializedData?: {
    type: 'supabase_insert' | 'supabase_update' | 'supabase_delete' | 'custom';
    table?: string;
    data?: any;
    filter?: { column: string; value: any };
    customKey?: string; // For custom operations
  };
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
    this.loadQueueFromStorage();
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

  /**
   * Load persisted queue from localStorage
   */
  private loadQueueFromStorage() {
    try {
      const stored = localStorage.getItem('caberu_offline_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Don't restore the operation functions yet - they'll be reconstructed when needed
        this.queue = parsed.map((item: any) => ({
          ...item,
          operation: () => Promise.resolve() // Placeholder, will be reconstructed
        }));
        logger.info(`Loaded ${this.queue.length} operations from offline storage`);
      }
    } catch (error) {
      logger.error('Failed to load offline queue from storage:', error);
      // Clear corrupted data
      localStorage.removeItem('caberu_offline_queue');
    }
  }

  /**
   * Save queue to localStorage for persistence
   */
  private saveQueueToStorage() {
    try {
      // Only save serializable parts
      const serializable = this.queue.map(({ id, operationName, timestamp, retries, serializedData }) => ({
        id,
        operationName,
        timestamp,
        retries,
        serializedData
      }));
      localStorage.setItem('caberu_offline_queue', JSON.stringify(serializable));
    } catch (error) {
      logger.error('Failed to save offline queue to storage:', error);
    }
  }

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

  private async handleOnline() {
    logger.info('Network connection restored');
    this.updateStatus('online');

    toast({
      title: 'Back Online',
      description: 'Connection restored. Syncing pending changes...',
      duration: 3000,
    });

    // Process queued operations
    this.processQueue();

    // Trigger offline data sync (lazy import to avoid circular dependencies)
    try {
      const { syncManager } = await import('./syncManager');
      setTimeout(() => syncManager.syncAll(), 3000); // Delay to let queue process first
    } catch (error) {
      logger.error('Failed to import syncManager:', error);
    }
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
  queueOperation(
    operationName: string,
    operation: () => Promise<any>,
    serializedData?: OfflineQueueItem['serializedData']
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item: OfflineQueueItem = {
      id,
      operation,
      operationName,
      timestamp: Date.now(),
      retries: 0,
      serializedData,
    };

    this.queue.push(item);
    this.saveQueueToStorage(); // Persist to localStorage
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
    this.saveQueueToStorage(); // Clear storage as we're processing

    for (const item of toProcess) {
      try {
        // Reconstruct operation from serialized data if function is placeholder
        const operation = await this.reconstructOperation(item);
        await operation();
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

    this.saveQueueToStorage(); // Save any re-queued items

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
   * Reconstruct operation function from serialized data
   */
  private async reconstructOperation(item: OfflineQueueItem): Promise<() => Promise<any>> {
    // If operation is already valid, use it
    if (item.operation && item.operation.toString() !== '() => Promise.resolve()') {
      return item.operation;
    }

    // Reconstruct from serialized data
    if (!item.serializedData) {
      throw new Error('Cannot reconstruct operation: no serialized data');
    }

    const { type, table, data, filter } = item.serializedData;

    // Lazy load supabase to avoid circular dependencies
    const { supabase } = await import('@/integrations/supabase/client');

    switch (type) {
      case 'supabase_insert':
        return async () => {
          const { error } = await supabase.from(table!).insert(data);
          if (error) throw error;
        };

      case 'supabase_update':
        return async () => {
          let query = supabase.from(table!).update(data);
          if (filter) {
            query = query.eq(filter.column, filter.value);
          }
          const { error } = await query;
          if (error) throw error;
        };

      case 'supabase_delete':
        return async () => {
          let query = supabase.from(table!).delete();
          if (filter) {
            query = query.eq(filter.column, filter.value);
          }
          const { error } = await query;
          if (error) throw error;
        };

      default:
        throw new Error(`Unknown operation type: ${type}`);
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
    this.saveQueueToStorage();
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
