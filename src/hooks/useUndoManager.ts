/**
 * useUndoManager Hook
 *
 * Provides Gmail-style undo functionality with toast notifications.
 * Supports delayed execution and undo cancellation.
 *
 * @example
 * const { executeWithUndo } = useUndoManager();
 *
 * await executeWithUndo({
 *   action: async () => deleteAppointment(id),
 *   undo: async () => restoreAppointment(snapshot),
 *   message: 'Appointment deleted',
 *   undoDelay: 5000, // 5 seconds to undo
 * });
 */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface UndoAction<T = any> {
  /** The action to execute after the undo delay */
  action: () => Promise<T>;
  /** The undo function to restore previous state */
  undo: () => Promise<void>;
  /** Success message to show in toast */
  message: string;
  /** Optional description for the toast */
  description?: string;
  /** Delay before executing the action (default: 5000ms) */
  undoDelay?: number;
  /** Query keys to invalidate after action completes */
  invalidateQueries?: string[][];
  /** Callback after successful action */
  onSuccess?: (result: T) => void;
  /** Callback after undo */
  onUndo?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface PendingAction<T = any> {
  timeoutId: NodeJS.Timeout;
  action: () => Promise<T>;
  undo: () => Promise<void>;
  invalidateQueries?: string[][];
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  toastId: string | number;
}

/**
 * Cancel a pending undoable action identified by its actionId.
 *
 * @param actionId - The unique identifier of the pending action to cancel
 */

/**
 * Schedule an action to run after a configurable undo delay and present an "Undo" toast.
 *
 * The provided `undo` function will be executed if the user chooses to undo before the delay elapses.
 * If the action executes successfully, configured query keys will be invalidated and `onSuccess` will be called.
 * If the action fails, the hook attempts to run `undo` as a rollback and calls `onError` on failure.
 *
 * @param options - Configuration for the undoable action:
 *   - action: The operation to run after the undo delay.
 *   - undo: The function to revert the operation if undone or when rollback is needed.
 *   - message: Toast message shown when the action is scheduled.
 *   - description: Optional toast description.
 *   - undoDelay: Milliseconds to wait before executing `action` (default: 5000).
 *   - invalidateQueries: Array of query key arrays to invalidate after successful action.
 *   - onSuccess: Callback invoked with the action result after a successful execution.
 *   - onUndo: Callback invoked after a successful undo.
 *   - onError: Callback invoked if the action ultimately fails.
 * @returns void
 */

/**
 * Execute an action immediately with optimistic UI behavior and rollback on error.
 *
 * Shows a success toast immediately, runs `action`, invalidates configured query keys on success,
 * and calls `rollback` plus an error toast if the action fails.
 *
 * @param options - Configuration for the optimistic action:
 *   - action: The operation to execute immediately.
 *   - rollback: Function to revert optimistic changes if `action` fails.
 *   - message: Toast message shown immediately.
 *   - description: Optional toast description.
 *   - invalidateQueries: Array of query key arrays to invalidate after success.
 *   - onSuccess: Callback invoked with the action result after success.
 *   - onError: Callback invoked if the action fails.
 * @returns void
 */

/**
 * Cancel all pending undoable actions currently tracked by the manager.
 */
export function useUndoManager() {
  const queryClient = useQueryClient();
  const pendingActions = useRef<Map<string, PendingAction>>(new Map());

  /**
   * Cancel a pending action by its ID
   */
  const cancelAction = useCallback((actionId: string) => {
    const pending = pendingActions.current.get(actionId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingActions.current.delete(actionId);
      toast.dismiss(pending.toastId);
    }
  }, []);

  /**
   * Execute an action with undo capability
   */
  const executeWithUndo = useCallback(async <T = any>(
    options: UndoAction<T>
  ): Promise<void> => {
    const {
      action,
      undo,
      message,
      description,
      undoDelay = 5000,
      invalidateQueries = [],
      onSuccess,
      onUndo,
      onError,
    } = options;

    // Generate unique ID for this action
    const actionId = `${Date.now()}-${Math.random()}`;
    let isUndone = false;

    // Show toast with undo button
    const toastId = toast.success(message, {
      description,
      duration: undoDelay,
      action: {
        label: 'Undo',
        onClick: async () => {
          isUndone = true;
          cancelAction(actionId);

          try {
            // Execute undo
            await undo();
            onUndo?.();

            toast.success('Action undone', {
              duration: 3000,
            });

            // Invalidate queries to refresh UI (don't let this fail the undo)
            if (invalidateQueries.length > 0) {
              try {
                await Promise.all(
                  invalidateQueries.map(queryKey =>
                    queryClient.invalidateQueries({ queryKey })
                  )
                );
              } catch (queryError) {
                console.warn('Query invalidation failed (non-fatal):', queryError);
              }
            }
          } catch (error) {
            console.error('Undo failed:', error);
            toast.error('Failed to undo action', {
              description: error instanceof Error ? error.message : 'Please try again',
            });
          }
        },
      },
    });

    // Schedule the actual action
    const timeoutId = setTimeout(async () => {
      pendingActions.current.delete(actionId);

      // Don't execute if already undone
      if (isUndone) return;

      try {
        // Execute the actual action
        const result = await action();

        // Invalidate queries to refresh UI
        if (invalidateQueries.length > 0) {
          await Promise.all(
            invalidateQueries.map(queryKey =>
              queryClient.invalidateQueries({ queryKey })
            )
          );
        }

        onSuccess?.(result);
      } catch (error) {
        console.error('Action failed:', error);

        // Try to undo since the action failed
        try {
          await undo();
          toast.error('Action failed and was reverted', {
            description: error instanceof Error ? error.message : 'Please try again',
          });
        } catch (undoError) {
          console.error('Undo also failed:', undoError);
          toast.error('Action failed', {
            description: 'Unable to revert changes. Please refresh the page.',
          });
        }

        onError?.(error instanceof Error ? error : new Error('Unknown error'));
      }
    }, undoDelay);

    // Store pending action
    pendingActions.current.set(actionId, {
      timeoutId,
      action,
      undo,
      invalidateQueries,
      onSuccess,
      onError,
      toastId,
    });
  }, [queryClient, cancelAction]);

  /**
   * Execute an action immediately with optimistic update and rollback on error
   * (No undo button, but shows rollback behavior on failure)
   */
  const executeOptimistic = useCallback(async <T = any>(options: {
    action: () => Promise<T>;
    rollback: () => void;
    message: string;
    description?: string;
    invalidateQueries?: string[][];
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
  }): Promise<void> => {
    const {
      action,
      rollback,
      message,
      description,
      invalidateQueries = [],
      onSuccess,
      onError,
    } = options;

    // Show success message immediately
    toast.success(message, { description });

    try {
      // Execute action
      const result = await action();

      // Invalidate queries
      if (invalidateQueries.length > 0) {
        await Promise.all(
          invalidateQueries.map(queryKey =>
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }

      onSuccess?.(result);
    } catch (error) {
      console.error('Action failed:', error);

      // Rollback
      rollback();

      toast.error('Action failed', {
        description: error instanceof Error ? error.message : 'Changes have been reverted',
      });

      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }, [queryClient]);

  /**
   * Cancel all pending actions
   */
  const cancelAll = useCallback(() => {
    pendingActions.current.forEach((pending, actionId) => {
      cancelAction(actionId);
    });
  }, [cancelAction]);

  return {
    executeWithUndo,
    executeOptimistic,
    cancelAction,
    cancelAll,
  };
}