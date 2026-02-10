import { logger } from './logger';

/**
 * IndexedDB wrapper for secure offline data storage
 * Stores data locally when offline and syncs when connection is restored
 */

const DB_NAME = 'CaberuOfflineDB';
const DB_VERSION = 1;

// Store names
export const STORES = {
  APPOINTMENTS: 'appointments',
  PATIENTS: 'patients',
  TREATMENTS: 'treatments',
  BILLING: 'billing',
  INVENTORY: 'inventory',
  METADATA: 'metadata', // For tracking sync status, timestamps, etc.
} as const;

export interface OfflineRecord<T = any> {
  id: string; // Temporary ID for offline records (temp-timestamp)
  data: T;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  synced: boolean;
  serverId?: string; // Real ID once synced to server
  tableName: string;
  encryptedFields?: string[]; // Fields that are encrypted
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for different data types
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });

            // Create indexes for efficient querying
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
            store.createIndex('operation', 'operation', { unique: false });

            if (storeName !== STORES.METADATA) {
              store.createIndex('serverId', 'serverId', { unique: false });
            }
          }
        });

        logger.info('IndexedDB schema created');
      };
    });

    return this.initPromise;
  }

  /**
   * Store data offline
   */
  async set<T>(
    storeName: string,
    record: OfflineRecord<T>
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(record);

      request.onsuccess = () => {
        logger.info(`Stored offline record in ${storeName}:`, record.id);
        resolve();
      };

      request.onerror = () => {
        logger.error(`Failed to store record in ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a single record by ID
   */
  async get<T>(
    storeName: string,
    id: string
  ): Promise<OfflineRecord<T> | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all records from a store
   */
  async getAll<T>(storeName: string): Promise<OfflineRecord<T>[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get unsynced records (pending operations)
   */
  async getUnsynced<T>(storeName: string): Promise<OfflineRecord<T>[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('synced');
      const request = index.getAll(false); // Get all unsynced records

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark record as synced
   */
  async markSynced(
    storeName: string,
    id: string,
    serverId?: string
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const record = await this.get(storeName, id);
    if (!record) {
      logger.warn(`Record ${id} not found in ${storeName}`);
      return;
    }

    record.synced = true;
    if (serverId) {
      record.serverId = serverId;
    }

    await this.set(storeName, record);
  }

  /**
   * Delete a record
   */
  async delete(storeName: string, id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        logger.info(`Deleted record ${id} from ${storeName}`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all records from a store
   */
  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        logger.info(`Cleared all records from ${storeName}`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get count of unsynced records
   */
  async getUnsyncedCount(storeName: string): Promise<number> {
    const unsynced = await this.getUnsynced(storeName);
    return unsynced.length;
  }

  /**
   * Get total count of all unsynced records across all stores
   */
  async getTotalUnsyncedCount(): Promise<number> {
    let total = 0;
    for (const store of Object.values(STORES)) {
      if (store !== STORES.METADATA) {
        total += await this.getUnsyncedCount(store);
      }
    }
    return total;
  }

  /**
   * Store metadata (like last sync time)
   */
  async setMetadata(key: string, value: any): Promise<void> {
    await this.set(STORES.METADATA, {
      id: key,
      data: value,
      operation: 'create',
      timestamp: Date.now(),
      synced: true,
      tableName: STORES.METADATA,
    });
  }

  /**
   * Get metadata
   */
  async getMetadata(key: string): Promise<any> {
    const record = await this.get(STORES.METADATA, key);
    return record?.data || null;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      logger.info('IndexedDB closed');
    }
  }

  /**
   * Delete entire database (use with caution!)
   */
  async deleteDatabase(): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
        logger.info('IndexedDB deleted');
        resolve();
      };

      request.onerror = () => {
        logger.error('Failed to delete IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

/**
 * Helper function to generate temporary IDs for offline records
 */
export function generateTempId(prefix: string = 'temp'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an ID is a temporary offline ID
 */
export function isTempId(id: string): boolean {
  return id.startsWith('temp-');
}
