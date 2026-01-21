import { renderHook, act } from '@testing-library/react';
import { useToast, toast, reducer } from '@/hooks/use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset toast state between tests
    act(() => {
      const { dismiss } = useToast();
      dismiss();
    });
  });

  describe('useToast hook', () => {
    it('initializes with empty toasts', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toEqual([]);
    });

    it('adds a toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test Toast',
          description: 'This is a test',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Test Toast');
      expect(result.current.toasts[0].description).toBe('This is a test');
      expect(result.current.toasts[0].open).toBe(true);
    });

    it('limits toasts to TOAST_LIMIT', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
        result.current.toast({ title: 'Toast 2' });
      });

      // TOAST_LIMIT is 1 in the implementation
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Toast 2');
    });

    it('generates unique IDs for each toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });

      const firstId = result.current.toasts[0].id;

      act(() => {
        result.current.dismiss();
      });

      act(() => {
        result.current.toast({ title: 'Toast 2' });
      });

      const secondId = result.current.toasts[0].id;

      expect(firstId).not.toBe(secondId);
    });

    it('dismisses a specific toast', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const t = result.current.toast({ title: 'Test Toast' });
        toastId = t.id;
      });

      expect(result.current.toasts[0].open).toBe(true);

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when no ID provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('handles toast with action', () => {
      const { result } = renderHook(() => useToast());
      const actionFn = jest.fn();

      act(() => {
        result.current.toast({
          title: 'Test Toast',
          action: {
            label: 'Undo',
            onClick: actionFn,
          } as any,
        });
      });

      expect(result.current.toasts[0].action).toBeDefined();
    });

    it('handles toast variants', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Destructive Toast',
          variant: 'destructive',
        });
      });

      expect(result.current.toasts[0].variant).toBe('destructive');
    });
  });

  describe('toast function', () => {
    it('can be called directly', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Direct Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Direct Toast');
    });

    it('returns dismiss and update functions', () => {
      const { result } = renderHook(() => useToast());

      let toastResult: { id: string; dismiss: () => void; update: (props: any) => void };

      act(() => {
        toastResult = toast({ title: 'Test' });
      });

      expect(toastResult.dismiss).toBeDefined();
      expect(toastResult.update).toBeDefined();
      expect(typeof toastResult.dismiss).toBe('function');
      expect(typeof toastResult.update).toBe('function');
    });

    it('can dismiss via returned function', () => {
      const { result } = renderHook(() => useToast());

      let dismissFn: () => void;

      act(() => {
        const t = toast({ title: 'Test' });
        dismissFn = t.dismiss;
      });

      expect(result.current.toasts[0].open).toBe(true);

      act(() => {
        dismissFn();
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('can update via returned function', () => {
      const { result } = renderHook(() => useToast());

      let updateFn: (props: any) => void;
      let toastId: string;

      act(() => {
        const t = toast({ title: 'Original Title' });
        updateFn = t.update;
        toastId = t.id;
      });

      expect(result.current.toasts[0].title).toBe('Original Title');

      act(() => {
        updateFn({ title: 'Updated Title', id: toastId });
      });

      expect(result.current.toasts[0].title).toBe('Updated Title');
    });

    it('triggers onOpenChange when dismissed', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test' });
      });

      const toastItem = result.current.toasts[0];
      expect(toastItem.onOpenChange).toBeDefined();

      act(() => {
        toastItem.onOpenChange?.(false);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });
  });

  describe('reducer', () => {
    it('handles ADD_TOAST action', () => {
      const state = { toasts: [] };
      const newToast = {
        id: '1',
        title: 'Test',
        open: true,
      };

      const newState = reducer(state, {
        type: 'ADD_TOAST',
        toast: newToast as any,
      });

      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0]).toEqual(newToast);
    });

    it('handles UPDATE_TOAST action', () => {
      const state = {
        toasts: [
          { id: '1', title: 'Original', open: true },
          { id: '2', title: 'Other', open: true },
        ] as any[],
      };

      const newState = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      });

      expect(newState.toasts[0].title).toBe('Updated');
      expect(newState.toasts[1].title).toBe('Other');
    });

    it('handles DISMISS_TOAST action with specific ID', () => {
      const state = {
        toasts: [
          { id: '1', title: 'First', open: true },
          { id: '2', title: 'Second', open: true },
        ] as any[],
      };

      const newState = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });

      expect(newState.toasts[0].open).toBe(false);
      expect(newState.toasts[1].open).toBe(true);
    });

    it('handles DISMISS_TOAST action without ID (dismisses all)', () => {
      const state = {
        toasts: [
          { id: '1', title: 'First', open: true },
          { id: '2', title: 'Second', open: true },
        ] as any[],
      };

      const newState = reducer(state, {
        type: 'DISMISS_TOAST',
      });

      expect(newState.toasts[0].open).toBe(false);
      expect(newState.toasts[1].open).toBe(false);
    });

    it('handles REMOVE_TOAST action with specific ID', () => {
      const state = {
        toasts: [
          { id: '1', title: 'First', open: true },
          { id: '2', title: 'Second', open: true },
        ] as any[],
      };

      const newState = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });

      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe('2');
    });

    it('handles REMOVE_TOAST action without ID (removes all)', () => {
      const state = {
        toasts: [
          { id: '1', title: 'First', open: true },
          { id: '2', title: 'Second', open: true },
        ] as any[],
      };

      const newState = reducer(state, {
        type: 'REMOVE_TOAST',
      });

      expect(newState.toasts).toHaveLength(0);
    });
  });

  describe('Multi-instance synchronization', () => {
    it('synchronizes state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      act(() => {
        result1.current.toast({ title: 'Shared Toast' });
      });

      expect(result1.current.toasts).toHaveLength(1);
      expect(result2.current.toasts).toHaveLength(1);
      expect(result1.current.toasts[0].title).toBe('Shared Toast');
      expect(result2.current.toasts[0].title).toBe('Shared Toast');
    });

    it('dismisses across instances', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const t = result1.current.toast({ title: 'Test' });
        toastId = t.id;
      });

      act(() => {
        result2.current.dismiss(toastId);
      });

      expect(result1.current.toasts[0].open).toBe(false);
      expect(result2.current.toasts[0].open).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles empty title and description', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({});
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBeUndefined();
      expect(result.current.toasts[0].description).toBeUndefined();
    });

    it('handles ReactNode as title and description', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test' as any,
          description: 'Description' as any,
        });
      });

      expect(result.current.toasts[0].title).toBe('Test');
      expect(result.current.toasts[0].description).toBe('Description');
    });

    it('does not crash when dismissing non-existent toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.dismiss('non-existent-id');
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('does not crash when updating non-existent toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test' });
      });

      const initialLength = result.current.toasts.length;

      act(() => {
        const state = { toasts: result.current.toasts };
        reducer(state, {
          type: 'UPDATE_TOAST',
          toast: { id: 'non-existent', title: 'Updated' },
        });
      });

      expect(result.current.toasts).toHaveLength(initialLength);
    });
  });
});
