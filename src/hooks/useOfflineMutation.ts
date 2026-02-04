import { useMutation, useQueryClient, MutationFunction, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { offlineManager } from '@/lib/offlineManager';
import { offlineStorage, generateTempId, isTempId, STORES } from '@/lib/offlineStorage';
import { encryptRecordForStorage, ENCRYPTED_FIELDS } from '@/lib/encryption';
import { logger } from '@/lib/logger';

export interface OfflineMutationOptions<TData, TVariables> {
  // The actual mutation function (runs when online)
  mutationFn: MutationFunction<TData, TVariables>;

  // Query key to invalidate on success
  queryKey: QueryKey;

  // Table name for offline storage
  tableName: string;

  // Store name in IndexedDB
  storeName: keyof typeof STORES;

  // Function to generate optimistic data for offline
  getOptimisticData: (variables: TVariables) => TData;

  // Operation type
  operation: 'create' | 'update' | 'delete';

  // Messages
  successMessage?: string;
  errorMessage?: string;
  offlineMessage?: string;

  // Callbacks
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;

  // Data type for encryption (optional)
  dataType?: keyof typeof ENCRYPTED_FIELDS;

  // Function to extract ID from variables (for updates/deletes)
  getIdFromVariables?: (variables: TVariables) => string;
}

/**
 * Offline-aware mutation hook
 * Automatically queues operations when offline and syncs when connection is restored
 *
 * @example
 * const createAppointment = useOfflineMutation({
 *   mutationFn: (data) => supabase.from('appointments').insert(data).select().single(),
 *   queryKey: ['appointments'],
 *   tableName: 'appointments',
 *   storeName: 'APPOINTMENTS',
 *   operation: 'create',
 *   getOptimisticData: (vars) => ({ id: generateTempId(), ...vars }),
 *   successMessage: 'Appointment created',
 *   offlineMessage: 'Appointment saved offline. Will sync when online.',
 *   dataType: 'appointments'
 * });
 */
export function useOfflineMutation<TData = unknown, TVariables = unknown>(
  options: OfflineMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();

  const {
    mutationFn,
    queryKey,
    tableName,
    storeName,
    getOptimisticData,
    operation,
    successMessage,
    errorMessage = 'Something went wrong',
    offlineMessage = 'Saved offline. Will sync when connection is restored.',
    onSuccess,
    onError,
    dataType,
    getIdFromVariables,
  } = options;

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const isOnline = navigator.onLine && offlineManager.isOnline();

      if (!isOnline) {
        // OFFLINE MODE: Store in IndexedDB and queue for later
        logger.info(`Offline ${operation}: Saving to IndexedDB`);

        // Generate optimistic data
        const optimisticData = getOptimisticData(variables);
        const tempId = (optimisticData as any).id || generateTempId();

        // Encrypt sensitive fields if dataType is provided
        let dataToStore = optimisticData;
        if (dataType) {
          dataToStore = await encryptRecordForStorage(
            optimisticData as any,
            dataType
          ) as TData;
        }

        // Store in IndexedDB
        await offlineStorage.set(STORES[storeName], {
          id: tempId,
          data: dataToStore,
          operation,
          timestamp: Date.now(),
          synced: false,
          tableName,
        });

        // Queue operation for when we're back online
        offlineManager.queueOperation(
          `${operation} ${tableName}`,
          async () => {
            // Execute the actual mutation when online
            const result = await mutationFn(variables);

            // Mark as synced in IndexedDB
            const serverId = (result as any)?.id;
            if (serverId) {
              await offlineStorage.markSynced(STORES[storeName], tempId, serverId);
            }

            // Invalidate queries to refetch
            queryClient.invalidateQueries({ queryKey });

            return result;
          },
          {
            type: 'custom',
            customKey: `offline-${operation}-${tableName}-${tempId}`,
          }
        );

        // Show offline toast
        toast.info(offlineMessage, {
          description: 'Your changes will be synced automatically when you\'re back online.',
          duration: 5000,
        });

        // Return optimistic data (unencrypted for UI)
        return optimisticData;
      }

      // ONLINE MODE: Execute mutation normally
      try {
        const result = await mutationFn(variables);
        return result;
      } catch (error: any) {
        // Check if error is due to network
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          // Network error - switch to offline mode
          logger.warn('Network error detected, switching to offline mode');
          offlineManager['updateStatus']('offline'); // Force offline status
          throw new Error('OFFLINE_FALLBACK'); // Signal to retry as offline
        }
        throw error;
      }
    },

    onMutate: async (variables: TVariables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update the cache
      const optimisticData = getOptimisticData(variables);

      if (operation === 'create') {
        // Add to list
        queryClient.setQueryData(queryKey, (old: any) => {
          if (Array.isArray(old)) {
            return [...old, optimisticData];
          }
          return optimisticData;
        });
      } else if (operation === 'update') {
        // Update in list
        const id = getIdFromVariables?.(variables) || (variables as any).id;
        queryClient.setQueryData(queryKey, (old: any) => {
          if (Array.isArray(old)) {
            return old.map((item: any) =>
              item.id === id ? { ...item, ...optimisticData } : item
            );
          }
          return optimisticData;
        });
      } else if (operation === 'delete') {
        // Remove from list
        const id = getIdFromVariables?.(variables) || (variables as any).id;
        queryClient.setQueryData(queryKey, (old: any) => {
          if (Array.isArray(old)) {
            return old.filter((item: any) => item.id !== id);
          }
          return [];
        });
      }

      return { previousData };
    },

    onError: (error: any, variables: TVariables, context: any) => {
      // Special case: offline fallback
      if (error.message === 'OFFLINE_FALLBACK') {
        // Already handled in mutationFn, don't show error
        return;
      }

      // Roll back optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      // Show error toast
      toast.error(errorMessage, {
        description: error.message || 'Please try again',
      });

      // Call custom error handler
      onError?.(error, variables);
    },

    onSuccess: (data: TData, variables: TVariables) => {
      // Show success toast if online
      if (navigator.onLine && successMessage) {
        toast.success(successMessage);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey });

      // Call custom success handler
      onSuccess?.(data, variables);
    },
  });
}

/**
 * Simplified offline mutation for common Supabase operations
 */
export function useOfflineSupabaseMutation<TData extends { id?: string }, TVariables = Partial<TData>>(
  options: {
    table: string;
    operation: 'create' | 'update' | 'delete';
    queryKey: QueryKey;
    storeName: keyof typeof STORES;
    successMessage?: string;
    dataType?: keyof typeof ENCRYPTED_FIELDS;
    mutationFn: MutationFunction<TData, TVariables>;
  }
) {
  return useOfflineMutation<TData, TVariables>({
    ...options,
    tableName: options.table,
    getOptimisticData: (variables: TVariables) => {
      if (options.operation === 'create') {
        return {
          id: generateTempId(options.table),
          ...variables,
        } as TData;
      }
      return variables as TData;
    },
    getIdFromVariables: (variables: TVariables) => (variables as any).id,
    offlineMessage: `${options.operation === 'create' ? 'Created' : options.operation === 'update' ? 'Updated' : 'Deleted'} offline. Will sync when online.`,
  });
}
