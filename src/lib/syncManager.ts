import { offlineStorage, STORES, OfflineRecord, isTempId } from './offlineStorage';
import { decryptRecordFromStorage, ENCRYPTED_FIELDS } from './encryption';
import { logger } from './logger';
import { toast } from '@/hooks/use-toast';

/**
 * Sync manager for offline data
 * Handles syncing data from IndexedDB to server when connection is restored
 */

export interface SyncResult {
  synced: number;
  failed: number;
  total: number;
  errors: Array<{ record: OfflineRecord; error: Error }>;
}

class SyncManager {
  private syncing = false;
  private syncCallbacks: Set<(result: SyncResult) => void> = new Set();

  /**
   * Subscribe to sync completion events
   */
  onSyncComplete(callback: (result: SyncResult) => void): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * Sync all offline data to server
   */
  async syncAll(): Promise<SyncResult> {
    if (this.syncing) {
      logger.warn('Sync already in progress');
      return { synced: 0, failed: 0, total: 0, errors: [] };
    }

    this.syncing = true;
    logger.info('Starting offline data sync...');

    const result: SyncResult = {
      synced: 0,
      failed: 0,
      total: 0,
      errors: [],
    };

    try {
      // Sync each store
      for (const storeName of Object.values(STORES)) {
        if (storeName === STORES.METADATA) continue; // Skip metadata

        const storeResult = await this.syncStore(storeName);
        result.synced += storeResult.synced;
        result.failed += storeResult.failed;
        result.total += storeResult.total;
        result.errors.push(...storeResult.errors);
      }

      logger.info(`Sync complete: ${result.synced}/${result.total} synced, ${result.failed} failed`);

      // Notify subscribers
      this.syncCallbacks.forEach(callback => callback(result));

      // Show toast
      if (result.total > 0) {
        if (result.failed === 0) {
          toast({
            title: 'Sync Complete',
            description: `Successfully synced ${result.synced} ${result.synced === 1 ? 'change' : 'changes'}.`,
            duration: 3000,
          });
        } else {
          toast({
            title: 'Sync Partially Failed',
            description: `Synced ${result.synced}/${result.total} changes. ${result.failed} failed.`,
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      logger.error('Sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: 'Unable to sync offline data. Will retry later.',
        variant: 'destructive',
      });
    } finally {
      this.syncing = false;
    }

    return result;
  }

  /**
   * Sync a single store
   */
  private async syncStore(storeName: string): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      failed: 0,
      total: 0,
      errors: [],
    };

    try {
      // Get all unsynced records
      const records = await offlineStorage.getUnsynced(storeName);
      result.total = records.length;

      if (records.length === 0) {
        return result;
      }

      logger.info(`Syncing ${records.length} records from ${storeName}`);

      // Sort by timestamp to maintain order
      records.sort((a, b) => a.timestamp - b.timestamp);

      // Lazy load supabase
      const { supabase } = await import('@/integrations/supabase/client');

      // Sync each record
      for (const record of records) {
        try {
          // Decrypt if needed
          const dataType = this.getDataTypeForStore(storeName);
          let data = record.data;

          if (dataType && record.data) {
            try {
              data = await decryptRecordFromStorage(record.data, dataType);
            } catch (error) {
              logger.warn(`Failed to decrypt record ${record.id}, using as-is:`, error);
            }
          }

          // Remove temp ID for creates
          if (record.operation === 'create' && isTempId(data.id)) {
            delete data.id;
          }

          // Execute operation based on type
          let serverData: any;

          switch (record.operation) {
            case 'create':
              const { data: insertData, error: insertError } = await supabase
                .from(record.tableName)
                .insert(data)
                .select()
                .single();

              if (insertError) throw insertError;
              serverData = insertData;
              break;

            case 'update':
              const { data: updateData, error: updateError } = await supabase
                .from(record.tableName)
                .update(data)
                .eq('id', record.serverId || data.id)
                .select()
                .single();

              if (updateError) throw updateError;
              serverData = updateData;
              break;

            case 'delete':
              const { error: deleteError } = await supabase
                .from(record.tableName)
                .delete()
                .eq('id', record.serverId || data.id);

              if (deleteError) throw deleteError;
              break;
          }

          // Mark as synced
          if (record.operation === 'delete') {
            // Delete from IndexedDB
            await offlineStorage.delete(storeName, record.id);
          } else {
            // Mark as synced and update with server ID
            await offlineStorage.markSynced(
              storeName,
              record.id,
              serverData?.id
            );
          }

          result.synced++;
          logger.info(`Synced ${record.operation} ${record.tableName} (${record.id})`);
        } catch (error: any) {
          logger.error(`Failed to sync record ${record.id}:`, error);
          result.failed++;
          result.errors.push({ record, error });

          // Don't retry if it's a validation error
          if (error.code === '23505' || error.code === '23503') {
            // Unique constraint or foreign key violation
            logger.warn(`Removing invalid record ${record.id}`);
            await offlineStorage.delete(storeName, record.id);
          }
        }
      }
    } catch (error: any) {
      logger.error(`Failed to sync store ${storeName}:`, error);
      result.failed = result.total - result.synced;
    }

    return result;
  }

  /**
   * Get data type for encryption based on store name
   */
  private getDataTypeForStore(storeName: string): keyof typeof ENCRYPTED_FIELDS | undefined {
    const mapping: Record<string, keyof typeof ENCRYPTED_FIELDS> = {
      [STORES.APPOINTMENTS]: 'appointments',
      [STORES.PATIENTS]: 'patients',
      [STORES.TREATMENTS]: 'treatments',
      [STORES.BILLING]: 'billing',
    };

    return mapping[storeName];
  }

  /**
   * Get count of unsynced records
   */
  async getUnsyncedCount(): Promise<number> {
    return await offlineStorage.getTotalUnsyncedCount();
  }

  /**
   * Clear all synced records (cleanup)
   */
  async clearSynced(): Promise<void> {
    for (const storeName of Object.values(STORES)) {
      if (storeName === STORES.METADATA) continue;

      const allRecords = await offlineStorage.getAll(storeName);
      const synced = allRecords.filter(r => r.synced);

      for (const record of synced) {
        await offlineStorage.delete(storeName, record.id);
      }
    }

    logger.info('Cleared all synced records');
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Auto-sync when connection is restored
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    logger.info('Connection restored, starting auto-sync...');

    // Wait a bit to ensure connection is stable
    setTimeout(async () => {
      try {
        await syncManager.syncAll();
      } catch (error) {
        logger.error('Auto-sync failed:', error);
      }
    }, 2000);
  });
}
