/**
 * useOptimisticAppointmentActions Hook
 * Provides optimistic UI updates for all appointment actions:
 * - Confirm, Decline, Cancel
 * - Save draft, Finalize
 * 
 * Updates happen immediately, modal closes, and server sync happens in background.
 * On error, state is reverted with user notification.
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';

interface AppointmentSnapshot {
  id: string;
  status: string;
  payment_status: string | null;
  consultation_notes: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface UseOptimisticAppointmentActionsOptions {
  businessId?: string;
  onSuccess?: (action: string, appointmentId: string) => void;
  onOptimisticUpdate?: (appointmentId: string, updates: Partial<AppointmentSnapshot>) => void;
}

export function useOptimisticAppointmentActions(options: UseOptimisticAppointmentActionsOptions = {}) {
  const { businessId, onSuccess, onOptimisticUpdate } = options;
  const queryClient = useQueryClient();
  const pendingUpdates = useRef<Map<string, AppointmentSnapshot>>(new Map());

  /**
   * Store original state for rollback
   */
  const saveSnapshot = useCallback((appointment: AppointmentSnapshot) => {
    pendingUpdates.current.set(appointment.id, { ...appointment });
  }, []);

  /**
   * Rollback to original state
   */
  const rollback = useCallback((appointmentId: string, errorMessage?: string) => {
    const original = pendingUpdates.current.get(appointmentId);
    if (original) {
      onOptimisticUpdate?.(appointmentId, original);
      pendingUpdates.current.delete(appointmentId);
    }
    
    toast.error('Action failed', {
      description: errorMessage || 'Please try again',
    });
  }, [onOptimisticUpdate]);

  /**
   * Invalidate all relevant queries after successful update
   */
  const invalidateQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['all-appointments'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['completed-appointments'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['monthly-appointments'], exact: false }),
    ]);
  }, [queryClient]);

  /**
   * Confirm an appointment (pending -> confirmed)
   */
  const confirmAppointment = useCallback(async (
    appointment: AppointmentSnapshot,
    closeModal?: () => void
  ) => {
    const updates: Partial<AppointmentSnapshot> = {
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    };

    // 1. Save snapshot for rollback
    saveSnapshot(appointment);
    
    // 2. Optimistically update UI
    onOptimisticUpdate?.(appointment.id, updates);
    
    // 3. Close modal immediately
    closeModal?.();
    
    // 4. Show immediate feedback
    toast.success('Appointment confirmed');

    // 5. Sync with server in background
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', appointment.id);

      if (error) throw error;

      // 6. Cleanup and refresh
      pendingUpdates.current.delete(appointment.id);
      await invalidateQueries();
      onSuccess?.('confirm', appointment.id);
    } catch (error) {
      rollback(appointment.id, 'Failed to confirm appointment');
    }
  }, [saveSnapshot, onOptimisticUpdate, invalidateQueries, rollback, onSuccess]);

  /**
   * Decline an appointment (pending -> cancelled)
   */
  const declineAppointment = useCallback(async (
    appointment: AppointmentSnapshot,
    closeModal?: () => void
  ) => {
    const updates: Partial<AppointmentSnapshot> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };

    saveSnapshot(appointment);
    onOptimisticUpdate?.(appointment.id, updates);
    closeModal?.();
    toast.success('Appointment declined');

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', appointment.id);

      if (error) throw error;

      pendingUpdates.current.delete(appointment.id);
      await invalidateQueries();
      onSuccess?.('decline', appointment.id);
    } catch (error) {
      rollback(appointment.id, 'Failed to decline appointment');
    }
  }, [saveSnapshot, onOptimisticUpdate, invalidateQueries, rollback, onSuccess]);

  /**
   * Cancel an appointment
   */
  const cancelAppointment = useCallback(async (
    appointment: AppointmentSnapshot,
    closeModal?: () => void
  ) => {
    const updates: Partial<AppointmentSnapshot> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };

    saveSnapshot(appointment);
    onOptimisticUpdate?.(appointment.id, updates);
    closeModal?.();
    toast.success('Appointment cancelled');

    try {
      // Release the slot
      await supabase.rpc('release_appointment_slots', { p_appointment_id: appointment.id });
      
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', appointment.id);

      if (error) throw error;

      pendingUpdates.current.delete(appointment.id);
      await invalidateQueries();
      onSuccess?.('cancel', appointment.id);
    } catch (error) {
      rollback(appointment.id, 'Failed to cancel appointment');
    }
  }, [saveSnapshot, onOptimisticUpdate, invalidateQueries, rollback, onSuccess]);

  /**
   * Save draft notes (doesn't change status)
   */
  const saveDraft = useCallback(async (
    appointmentId: string,
    notes: string,
    closeModal?: () => void
  ) => {
    // Don't close modal for draft save - user might want to continue editing
    toast.success('Draft saved');

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          consultation_notes: notes,
          updated_at: new Date().toISOString() 
        })
        .eq('id', appointmentId);

      if (error) throw error;

      await invalidateQueries();
      onSuccess?.('saveDraft', appointmentId);
    } catch (error) {
      toast.error('Failed to save draft', {
        description: 'Please try again',
      });
    }
  }, [invalidateQueries, onSuccess]);

  /**
   * Finalize appointment (-> completed with completed_at)
   */
  const finalizeAppointment = useCallback(async (
    appointment: AppointmentSnapshot,
    notes: string,
    totalCents: number,
    closeModal?: () => void
  ) => {
    const updates: Partial<AppointmentSnapshot> = {
      status: 'completed',
      consultation_notes: notes,
      completed_at: new Date().toISOString(),
      payment_status: totalCents > 0 ? 'pending' : 'paid',
      updated_at: new Date().toISOString(),
    };

    saveSnapshot(appointment);
    onOptimisticUpdate?.(appointment.id, updates);
    closeModal?.();
    toast.success('Appointment finalized');

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          consultation_notes: notes,
          completed_at: new Date().toISOString(),
          amount_paid_cents: totalCents,
          payment_status: totalCents > 0 ? 'pending' : 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);

      if (error) throw error;

      pendingUpdates.current.delete(appointment.id);
      await invalidateQueries();
      onSuccess?.('finalize', appointment.id);
    } catch (error) {
      rollback(appointment.id, 'Failed to finalize appointment');
    }
  }, [saveSnapshot, onOptimisticUpdate, invalidateQueries, rollback, onSuccess]);

  return {
    confirmAppointment,
    declineAppointment,
    cancelAppointment,
    saveDraft,
    finalizeAppointment,
  };
}
