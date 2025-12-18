import { useMutation, useQueryClient, MutationFunction, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

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
 * A reusable hook for optimistic mutations with React Query.
 * 
 * Updates the UI immediately, then syncs with server.
 * Automatically rolls back on error.
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
            // Roll back to the previous value on error
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
            // Always refetch after error or success to ensure cache is in sync
            queryClient.invalidateQueries({ queryKey });
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
