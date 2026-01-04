/**
 * useAppointmentActionsWithUndo Hook
 *
 * Enhanced appointment actions with Gmail-style undo functionality.
 * Provides a 5-second window to undo destructive actions like cancel/decline.
 *
 * @example
 * const { cancelAppointmentWithUndo, declineAppointmentWithUndo } = useAppointmentActionsWithUndo({
 *   businessId: 'abc123',
 *   onOptimisticUpdate: (id, updates) => updateLocalState(id, updates),
 * });
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUndoManager } from './useUndoManager';

interface AppointmentSnapshot {
  id: string;
  status: string;
  payment_status: string | null;
  consultation_notes: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface UseAppointmentActionsWithUndoOptions {
  businessId?: string;
  onSuccess?: (action: string, appointmentId: string) => void;
  onOptimisticUpdate?: (appointmentId: string, updates: Partial<AppointmentSnapshot>) => void;
}

export function useAppointmentActionsWithUndo(options: UseAppointmentActionsWithUndoOptions = {}) {
  const { businessId, onSuccess, onOptimisticUpdate } = options;
  const queryClient = useQueryClient();
  const { executeWithUndo } = useUndoManager();
  const snapshots = useRef<Map<string, AppointmentSnapshot>>(new Map());

  /**
   * Get query keys to invalidate
   */
  const getQueryKeys = useCallback(() => [
    ['appointments'],
    ['appointments-calendar'],
    ['all-appointments'],
    ['completed-appointments'],
    ['monthly-appointments'],
  ], []);

  /**
   * Cancel an appointment with undo support
   */
  const cancelAppointmentWithUndo = useCallback(async (
    appointment: AppointmentSnapshot,
    closeModal?: () => void
  ) => {
    // Save snapshot for undo
    snapshots.current.set(appointment.id, { ...appointment });

    // Optimistically update UI
    const updates: Partial<AppointmentSnapshot> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };
    onOptimisticUpdate?.(appointment.id, updates);
    closeModal?.();

    await executeWithUndo({
      message: 'Appointment cancelled',
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        // Release the slot
        await supabase.rpc('release_appointment_slots', { p_appointment_id: appointment.id });

        // Update appointment status
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', appointment.id);

        if (error) throw error;

        snapshots.current.delete(appointment.id);
        onSuccess?.('cancel', appointment.id);
      },
      undo: async () => {
        const original = snapshots.current.get(appointment.id);
        if (!original) return;

        // Restore original state
        onOptimisticUpdate?.(appointment.id, original);

        // Restore in database
        const { error } = await supabase
          .from('appointments')
          .update({
            status: original.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointment.id);

        if (error) throw error;

        snapshots.current.delete(appointment.id);
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [onOptimisticUpdate, onSuccess, executeWithUndo, getQueryKeys]);

  /**
   * Decline an appointment with undo support
   */
  const declineAppointmentWithUndo = useCallback(async (
    appointment: AppointmentSnapshot,
    closeModal?: () => void
  ) => {
    // Save snapshot for undo
    snapshots.current.set(appointment.id, { ...appointment });

    // Optimistically update UI
    const updates: Partial<AppointmentSnapshot> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };
    onOptimisticUpdate?.(appointment.id, updates);
    closeModal?.();

    await executeWithUndo({
      message: 'Appointment declined',
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', appointment.id);

        if (error) throw error;

        snapshots.current.delete(appointment.id);
        onSuccess?.('decline', appointment.id);
      },
      undo: async () => {
        const original = snapshots.current.get(appointment.id);
        if (!original) return;

        // Restore original state
        onOptimisticUpdate?.(appointment.id, original);

        // Restore in database
        const { error } = await supabase
          .from('appointments')
          .update({
            status: original.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointment.id);

        if (error) throw error;

        snapshots.current.delete(appointment.id);
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [onOptimisticUpdate, onSuccess, executeWithUndo, getQueryKeys]);

  /**
   * Mark appointment as no-show with undo support
   */
  const markNoShowWithUndo = useCallback(async (
    appointment: AppointmentSnapshot,
    closeModal?: () => void
  ) => {
    // Save snapshot for undo
    snapshots.current.set(appointment.id, { ...appointment });

    // Optimistically update UI
    const updates: Partial<AppointmentSnapshot> = {
      status: 'no-show',
      updated_at: new Date().toISOString(),
    };
    onOptimisticUpdate?.(appointment.id, updates);
    closeModal?.();

    await executeWithUndo({
      message: 'Marked as no-show',
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'no-show', updated_at: new Date().toISOString() })
          .eq('id', appointment.id);

        if (error) throw error;

        snapshots.current.delete(appointment.id);
        onSuccess?.('no-show', appointment.id);
      },
      undo: async () => {
        const original = snapshots.current.get(appointment.id);
        if (!original) return;

        // Restore original state
        onOptimisticUpdate?.(appointment.id, original);

        // Restore in database
        const { error } = await supabase
          .from('appointments')
          .update({
            status: original.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointment.id);

        if (error) throw error;

        snapshots.current.delete(appointment.id);
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [onOptimisticUpdate, onSuccess, executeWithUndo, getQueryKeys]);

  return {
    cancelAppointmentWithUndo,
    declineAppointmentWithUndo,
    markNoShowWithUndo,
  };
}
