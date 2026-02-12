import { useMutation, useQueryClient, MutationFunction, QueryKey, onlineManager } from '@tanstack/react-query';
import { toast } from 'sonner';
import { offlineManager } from '@/lib/offlineManager';

interface OptimisticMutationOptions<TData, TVariables, TContext> {
    mutationFn: MutationFunction<TData, TVariables>;
    queryKey: QueryKey;

    // Function to update cache optimistically
    updateCache: (oldData: TData[] | undefined, variables: TVariables) => TData[];

    // Optional: Transform variables to match cache item shape
    getOptimisticItem?: (variables: TVariables) => Partial<TData>;

    // Messages
    successMessage?: string;
    errorMessage?: string;

    // Callbacks
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
}

/**
 * Checks whether an error is a network/connectivity error (vs a server-side error).
 */
function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    if (error && typeof error === 'object') {
        if ('message' in error) {
            const msg = (error as { message: string }).message?.toLowerCase() ?? '';
            if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
                return true;
            }
        }
    }
    return !navigator.onLine;
}

/**
 * A reusable hook for optimistic mutations with React Query.
 *
 * Updates the UI immediately, then syncs with server.
 * When offline, keeps the optimistic update and queues the mutation
 * for automatic retry when connectivity is restored.
 *
 * @example
 * const updateAppointment = useOptimisticMutation({
 *   mutationFn: (data) => supabase.from('appointments').update(data).eq('id', data.id),
 *   queryKey: ['appointments'],
 *   updateCache: (old, newData) => old.map(apt => apt.id === newData.id ? {...apt, ...newData} : apt),
 *   successMessage: 'Appointment updated',
 *   errorMessage: 'Failed to update appointment'
 * });
 */
export function useOptimisticMutation<
    TData = unknown,
    TVariables = unknown,
    TContext = { previousData: TData[] | undefined }
>(options: OptimisticMutationOptions<TData, TVariables, TContext>) {
    const queryClient = useQueryClient();

    const {
        mutationFn,
        queryKey,
        updateCache,
        successMessage,
        errorMessage = 'Something went wrong',
        onSuccess,
        onError,
    } = options;

    return useMutation({
        mutationFn,

        onMutate: async (variables: TVariables) => {
            // Cancel any outgoing refetches to prevent overwriting optimistic update
            await queryClient.cancelQueries({ queryKey });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData<TData[]>(queryKey);

            // Optimistically update the cache
            queryClient.setQueryData<TData[]>(queryKey, (old) => updateCache(old, variables));

            // Return context with the snapshotted value
            return { previousData } as TContext;
        },

        onError: (error: Error, variables: TVariables, context: TContext | undefined) => {
            // If this is a network error (we're offline), keep the optimistic update
            // and queue the operation for retry when back online
            if (isNetworkError(error) || !onlineManager.isOnline()) {
                offlineManager.queueOperation(
                    errorMessage.replace(/^Failed to /, '').replace(/^Something went wrong/, 'Sync pending change'),
                    () => mutationFn(variables) as Promise<unknown>
                );

                toast.info('Saved offline', {
                    description: 'Your change will sync automatically when you\'re back online.',
                });

                // Don't roll back — keep the optimistic update visible
                return;
            }

            // For server-side errors, roll back to the previous value
            if (context && typeof context === 'object' && context !== null && 'previousData' in (context as Record<string, unknown>)) {
                queryClient.setQueryData(queryKey, (context as unknown as { previousData: TData[] }).previousData);
            }

            // Show error toast
            toast.error(errorMessage, {
                description: error.message || 'Please try again',
            });

            // Call custom error handler
            onError?.(error, variables, context);
        },

        onSuccess: (data: TData, variables: TVariables) => {
            // Show success toast if message provided
            if (successMessage) {
                toast.success(successMessage);
            }

            // Call custom success handler
            onSuccess?.(data, variables);
        },

        onSettled: () => {
            // Only invalidate queries if we're online, otherwise the refetch will fail
            if (onlineManager.isOnline()) {
                queryClient.invalidateQueries({ queryKey });
            }
        },
    });
}

/**
 * Simplified hook for list operations (add, update, delete)
 */
export function useOptimisticListMutation<TItem extends { id: string }>(options: {
    mutationFn: MutationFunction<TItem, Partial<TItem>>;
    queryKey: QueryKey;
    operation: 'add' | 'update' | 'delete';
    successMessage?: string;
    errorMessage?: string;
}) {
    const { operation, ...rest } = options;

    const updateCache = (oldData: TItem[] | undefined, variables: Partial<TItem>): TItem[] => {
        const data = oldData || [];

        switch (operation) {
            case 'add':
                // Add new item with temporary ID
                const tempItem = {
                    ...variables,
                    id: variables.id || `temp-${Date.now()}`
                } as TItem;
                return [...data, tempItem];

            case 'update':
                // Update existing item
                return data.map(item =>
                    item.id === variables.id ? { ...item, ...variables } : item
                );

            case 'delete':
                // Remove item
                return data.filter(item => item.id !== variables.id);

            default:
                return data;
        }
    };

    return useOptimisticMutation<TItem, Partial<TItem>, { previousData: TItem[] | undefined }>({
        ...rest,
        updateCache,
    });
}

export default useOptimisticMutation;
