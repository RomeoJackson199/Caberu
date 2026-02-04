import { renderHook, act, waitFor } from '@testing-library/react';
import { useUndoManager } from '../useUndoManager';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn().mockReturnValue('toast-id-1'),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}));

describe('useUndoManager', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    queryClient.clear();
  });

  describe('executeWithUndo', () => {
    it('should show success toast with undo button', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          description: 'Click to undo',
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Item deleted', {
        description: 'Click to undo',
        duration: 5000,
        action: expect.objectContaining({
          label: 'Undo',
          onClick: expect.any(Function),
        }),
      });
    });

    it('should execute action after delay', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          undoDelay: 3000,
          onSuccess: mockOnSuccess,
        });
      });

      // Action should not be called immediately
      expect(mockAction).not.toHaveBeenCalled();

      // Fast-forward time
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalled();
      });
    });

    it('should use default 5 second delay', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
        });
      });

      // Action should not be called at 4 seconds
      await act(async () => {
        jest.advanceTimersByTime(4000);
      });
      expect(mockAction).not.toHaveBeenCalled();

      // Action should be called at 5 seconds
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalled();
      });
    });

    it('should call onSuccess after successful action', async () => {
      const mockAction = jest.fn().mockResolvedValue('test-result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          undoDelay: 1000,
          onSuccess: mockOnSuccess,
        });
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('test-result');
      });
    });

    it('should invalidate queries after successful action', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          undoDelay: 1000,
          invalidateQueries: [['items'], ['inventory']],
        });
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['items'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['inventory'] });
      });
    });

    it('should handle action failure and call undo for rollback', async () => {
      const error = new Error('Action failed');
      const mockAction = jest.fn().mockRejectedValue(error);
      const mockUndo = jest.fn().mockResolvedValue(undefined);
      const mockOnError = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          undoDelay: 1000,
          onError: mockOnError,
        });
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockUndo).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Action failed and was reverted', {
          description: 'Action failed',
        });
        expect(mockOnError).toHaveBeenCalledWith(error);
      });

      consoleErrorSpy.mockRestore();
    });

    it('should show error when both action and undo fail', async () => {
      const mockAction = jest.fn().mockRejectedValue(new Error('Action failed'));
      const mockUndo = jest.fn().mockRejectedValue(new Error('Undo failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          undoDelay: 1000,
        });
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Action failed', {
          description: 'Unable to revert changes. Please refresh the page.',
        });
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('executeOptimistic', () => {
    it('should show success toast immediately', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockRollback = jest.fn();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        await result.current.executeOptimistic({
          action: mockAction,
          rollback: mockRollback,
          message: 'Item updated',
          description: 'Change saved',
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Item updated', {
        description: 'Change saved',
      });
    });

    it('should execute action immediately', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockRollback = jest.fn();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        await result.current.executeOptimistic({
          action: mockAction,
          rollback: mockRollback,
          message: 'Item updated',
        });
      });

      expect(mockAction).toHaveBeenCalled();
    });

    it('should call onSuccess after successful action', async () => {
      const mockAction = jest.fn().mockResolvedValue('test-result');
      const mockRollback = jest.fn();
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        await result.current.executeOptimistic({
          action: mockAction,
          rollback: mockRollback,
          message: 'Item updated',
          onSuccess: mockOnSuccess,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalledWith('test-result');
    });

    it('should invalidate queries after successful action', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockRollback = jest.fn();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        await result.current.executeOptimistic({
          action: mockAction,
          rollback: mockRollback,
          message: 'Item updated',
          invalidateQueries: [['items']],
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['items'] });
    });

    it('should call rollback on action failure', async () => {
      const error = new Error('Action failed');
      const mockAction = jest.fn().mockRejectedValue(error);
      const mockRollback = jest.fn();
      const mockOnError = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        await result.current.executeOptimistic({
          action: mockAction,
          rollback: mockRollback,
          message: 'Item updated',
          onError: mockOnError,
        });
      });

      expect(mockRollback).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Action failed', {
        description: 'Action failed',
      });
      expect(mockOnError).toHaveBeenCalledWith(error);

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error failures', async () => {
      const mockAction = jest.fn().mockRejectedValue('string error');
      const mockRollback = jest.fn();
      const mockOnError = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        await result.current.executeOptimistic({
          action: mockAction,
          rollback: mockRollback,
          message: 'Item updated',
          onError: mockOnError,
        });
      });

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cancelAction', () => {
    it('should cancel a pending action by ID', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      // Start an action
      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          undoDelay: 5000,
        });
      });

      // Get the toast call to extract the onClick handler
      const toastCall = (toast.success as jest.Mock).mock.calls[0];
      const undoHandler = toastCall[1].action.onClick;

      // Simulate clicking undo
      await act(async () => {
        await undoHandler();
      });

      // Fast-forward time - action should not execute
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockAction).not.toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalled();
    });
  });

  describe('cancelAll', () => {
    it('should cancel all pending actions', async () => {
      const mockAction1 = jest.fn().mockResolvedValue('result1');
      const mockAction2 = jest.fn().mockResolvedValue('result2');
      const mockUndo = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      // Start multiple actions
      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction1,
          undo: mockUndo,
          message: 'Item 1 deleted',
          undoDelay: 5000,
        });
        result.current.executeWithUndo({
          action: mockAction2,
          undo: mockUndo,
          message: 'Item 2 deleted',
          undoDelay: 5000,
        });
      });

      // Cancel all
      act(() => {
        result.current.cancelAll();
      });

      // Fast-forward time - actions should not execute
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockAction1).not.toHaveBeenCalled();
      expect(mockAction2).not.toHaveBeenCalled();
    });
  });

  describe('undo button callback', () => {
    it('should execute undo function when undo button is clicked', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);
      const mockOnUndo = jest.fn();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          onUndo: mockOnUndo,
        });
      });

      // Get the onClick handler from the toast call
      const toastCall = (toast.success as jest.Mock).mock.calls[0];
      const undoHandler = toastCall[1].action.onClick;

      // Simulate clicking undo
      await act(async () => {
        await undoHandler();
      });

      expect(mockUndo).toHaveBeenCalled();
      expect(mockOnUndo).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Action undone', { duration: 3000 });
    });

    it('should show error toast when undo fails', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockRejectedValue(new Error('Undo failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
        });
      });

      // Get the onClick handler from the toast call
      const toastCall = (toast.success as jest.Mock).mock.calls[0];
      const undoHandler = toastCall[1].action.onClick;

      // Simulate clicking undo
      await act(async () => {
        await undoHandler();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to undo action', {
        description: 'Undo failed',
      });

      consoleErrorSpy.mockRestore();
    });

    it('should invalidate queries after successful undo', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          invalidateQueries: [['items']],
        });
      });

      // Get the onClick handler from the toast call
      const toastCall = (toast.success as jest.Mock).mock.calls[0];
      const undoHandler = toastCall[1].action.onClick;

      // Simulate clicking undo
      await act(async () => {
        await undoHandler();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['items'] });
    });

    it('should not execute action if undone', async () => {
      const mockAction = jest.fn().mockResolvedValue('result');
      const mockUndo = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoManager(), { wrapper });

      await act(async () => {
        result.current.executeWithUndo({
          action: mockAction,
          undo: mockUndo,
          message: 'Item deleted',
          undoDelay: 5000,
        });
      });

      // Get the onClick handler and click undo
      const toastCall = (toast.success as jest.Mock).mock.calls[0];
      const undoHandler = toastCall[1].action.onClick;

      await act(async () => {
        await undoHandler();
      });

      // Fast-forward past the delay
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Action should not have been called since we undid it
      expect(mockAction).not.toHaveBeenCalled();
    });
  });
});
