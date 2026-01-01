import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { retryWithBackoff } from '@/lib/retryStrategies';
import { useState, useCallback } from 'react';

export interface EnhancedMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  invalidateQueries?: string[][];
  optimisticUpdate?: (variables: TVariables) => void;
  rollback?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  retry?: boolean;
  retryAttempts?: number;
}

/**
 * Enhanced mutation hook with optimistic updates, retry logic, and better error handling
 */
export function useEnhancedMutation<TData = unknown, TVariables = unknown>(
  options: EnhancedMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const [isOptimistic, setIsOptimistic] = useState(false);

  const {
    mutationFn,
    onSuccess,
    onError,
    invalidateQueries = [],
    optimisticUpdate,
    rollback,
    successMessage,
    errorMessage,
    retry = true,
    retryAttempts = 2,
  } = options;

  const mutation = useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      // Apply optimistic update if provided
      if (optimisticUpdate) {
        setIsOptimistic(true);
        optimisticUpdate(variables);
      }

      // Execute mutation with retry logic if enabled
      if (retry) {
        const result = await retryWithBackoff(
          () => mutationFn(variables),
          {
            maxAttempts: retryAttempts,
            baseDelay: 1000,
            onRetry: (attempt) => {
              logger.info(`Retrying mutation (attempt ${attempt})`);
            },
          }
        );

        if (!result.success) {
          throw result.error;
        }

        return result.data!;
      }

      return mutationFn(variables);
    },
    onSuccess: (data, variables) => {
      setIsOptimistic(false);

      // Invalidate related queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });

      // Show success message
      if (successMessage) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }

      // Call custom success handler
      onSuccess?.(data, variables);

      logger.info('Mutation completed successfully');
    },
    onError: (error, variables) => {
      setIsOptimistic(false);

      // Rollback optimistic update if provided
      if (rollback) {
        rollback(error);
      }

      // Show error message
      const displayMessage = errorMessage || error.message || 'Operation failed';

      toast({
        title: 'Error',
        description: displayMessage,
        variant: 'destructive',
      });

      // Call custom error handler
      onError?.(error, variables);

      logger.error('Mutation failed:', error);
    },
  });

  return {
    ...mutation,
    isOptimistic,
  };
}

/**
 * Hook for managing optimistic UI updates
 */
export function useOptimisticState<T>(initialValue: T) {
  const [optimisticValue, setOptimisticValue] = useState<T>(initialValue);
  const [serverValue, setServerValue] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);

  const update = useCallback((newValue: T) => {
    setOptimisticValue(newValue);
    setIsPending(true);
  }, []);

  const confirm = useCallback((confirmedValue: T) => {
    setServerValue(confirmedValue);
    setOptimisticValue(confirmedValue);
    setIsPending(false);
  }, []);

  const rollback = useCallback(() => {
    setOptimisticValue(serverValue);
    setIsPending(false);
  }, [serverValue]);

  return {
    value: optimisticValue,
    isPending,
    update,
    confirm,
    rollback,
  };
}
