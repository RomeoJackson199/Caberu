import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseOptimisticAppointmentStatusOptions {
  onOptimisticUpdate?: (appointmentId: string, updates: Record<string, unknown>) => void;
  onRollback?: (appointmentId: string, original: Record<string, unknown>) => void;
  onSuccess?: () => void;
}

/**
 * Hook for optimistic appointment status updates.
 * Updates the UI immediately, then syncs with the server.
 * Rolls back on error.
 */
export function useOptimisticAppointmentStatus(options: UseOptimisticAppointmentStatusOptions = {}) {
  const { onOptimisticUpdate, onRollback, onSuccess } = options;

  const updateStatus = useCallback(async (
    appointmentId: string,
    newStatus: string,
    currentAppointment: Record<string, unknown>,
    additionalUpdates: Record<string, unknown> = {}
  ) => {
    // Store original for rollback
    const original = { ...currentAppointment };
    
    // Optimistically update the UI
    const optimisticUpdates = {
      status: newStatus,
      ...additionalUpdates,
      updated_at: new Date().toISOString()
    };
    
    onOptimisticUpdate?.(appointmentId, optimisticUpdates);

    try {
      // Perform the actual update
      const { error } = await supabase
        .from('appointments')
        .update({
          status: newStatus,
          ...additionalUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // Success - UI already updated, call success callback
      onSuccess?.();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating appointment status:', error);
      
      // Rollback the optimistic update
      onRollback?.(appointmentId, original);
      
      toast.error('Failed to update appointment', {
        description: 'Please try again'
      });
      
      return { success: false, error };
    }
  }, [onOptimisticUpdate, onRollback, onSuccess]);

  return { updateStatus };
}

export default useOptimisticAppointmentStatus;
