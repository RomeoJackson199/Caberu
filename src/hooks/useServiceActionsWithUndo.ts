/**
 * useServiceActionsWithUndo Hook
 *
 * Service management actions with Gmail-style undo functionality.
 * Provides undo support for service deletions and status changes.
 *
 * @example
 * const { deleteServiceWithUndo, toggleServiceStatusWithUndo } = useServiceActionsWithUndo();
 *
 * await deleteServiceWithUndo(service);
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUndoManager } from './useUndoManager';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  requires_upfront_payment: boolean;
  is_active: boolean;
  duration_minutes: number | null;
  category: string | null;
  business_id: string;
  [key: string]: any;
}

export function useServiceActionsWithUndo() {
  const queryClient = useQueryClient();
  const { executeWithUndo } = useUndoManager();
  const deletedServices = useRef<Map<string, Service>>(new Map());

  /**
   * Get query keys to invalidate
   */
  const getQueryKeys = useCallback(() => [
    ['business-services'],
    ['services'],
    ['active-services'],
  ], []);

  /**
   * Delete a service with undo support
   */
  const deleteServiceWithUndo = useCallback(async (service: Service) => {
    // Save snapshot for undo
    deletedServices.current.set(service.id, { ...service });

    await executeWithUndo({
      message: `${service.name} deleted`,
      description: 'Click undo to restore service',
      undoDelay: 5000,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from('business_services')
          .delete()
          .eq('id', service.id);

        if (error) throw error;

        deletedServices.current.delete(service.id);
        return service;
      },
      undo: async () => {
        const original = deletedServices.current.get(service.id);
        if (!original) return;

        // Restore the service
        const { error } = await supabase
          .from('business_services')
          .insert([original]);

        if (error) throw error;

        deletedServices.current.delete(service.id);
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [executeWithUndo, getQueryKeys]);

  /**
   * Toggle service active status with undo support
   */
  const toggleServiceStatusWithUndo = useCallback(async (
    service: Service,
    newStatus?: boolean
  ) => {
    const previousStatus = service.is_active;
    const targetStatus = newStatus !== undefined ? newStatus : !previousStatus;

    await executeWithUndo({
      message: `${service.name} ${targetStatus ? 'activated' : 'deactivated'}`,
      description: 'Click undo to revert',
      undoDelay: 5000,
      action: async () => {
        // Update service status
        const { error } = await supabase
          .from('business_services')
          .update({ is_active: targetStatus, updated_at: new Date().toISOString() })
          .eq('id', service.id);

        if (error) throw error;

        return service;
      },
      undo: async () => {
        // Restore original status
        const { error } = await supabase
          .from('business_services')
          .update({ is_active: previousStatus, updated_at: new Date().toISOString() })
          .eq('id', service.id);

        if (error) throw error;
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [executeWithUndo, getQueryKeys]);

  /**
   * Update service price with undo support
   */
  const updateServicePriceWithUndo = useCallback(async (
    service: Service,
    newPriceCents: number
  ) => {
    const previousPrice = service.price_cents;

    await executeWithUndo({
      message: 'Service price updated',
      description: `${service.name}: €${previousPrice / 100} → €${newPriceCents / 100}`,
      undoDelay: 5000,
      action: async () => {
        // Update service price
        const { error } = await supabase
          .from('business_services')
          .update({ price_cents: newPriceCents, updated_at: new Date().toISOString() })
          .eq('id', service.id);

        if (error) throw error;

        return service;
      },
      undo: async () => {
        // Restore original price
        const { error } = await supabase
          .from('business_services')
          .update({ price_cents: previousPrice, updated_at: new Date().toISOString() })
          .eq('id', service.id);

        if (error) throw error;
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [executeWithUndo, getQueryKeys]);

  /**
   * Bulk delete services with undo support
   */
  const bulkDeleteServicesWithUndo = useCallback(async (services: Service[]) => {
    // Save snapshots for undo
    services.forEach(service => {
      deletedServices.current.set(service.id, { ...service });
    });

    await executeWithUndo({
      message: `${services.length} services deleted`,
      description: 'Click undo to restore all',
      undoDelay: 5000,
      action: async () => {
        // Perform bulk deletion
        const { error } = await supabase
          .from('business_services')
          .delete()
          .in('id', services.map(s => s.id));

        if (error) throw error;

        services.forEach(service => deletedServices.current.delete(service.id));
      },
      undo: async () => {
        // Restore all services
        const servicesToRestore = services
          .map(service => deletedServices.current.get(service.id))
          .filter(Boolean) as Service[];

        if (servicesToRestore.length === 0) return;

        const { error } = await supabase
          .from('business_services')
          .insert(servicesToRestore);

        if (error) throw error;

        services.forEach(service => deletedServices.current.delete(service.id));
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [executeWithUndo, getQueryKeys]);

  /**
   * Bulk toggle services status with undo support
   */
  const bulkToggleServicesWithUndo = useCallback(async (
    services: Service[],
    targetStatus: boolean
  ) => {
    await executeWithUndo({
      message: `${services.length} services ${targetStatus ? 'activated' : 'deactivated'}`,
      description: 'Click undo to revert all',
      undoDelay: 5000,
      action: async () => {
        // Perform bulk update
        const { error } = await supabase
          .from('business_services')
          .update({ is_active: targetStatus, updated_at: new Date().toISOString() })
          .in('id', services.map(s => s.id));

        if (error) throw error;
      },
      undo: async () => {
        // Restore each service to its original status
        for (const service of services) {
          await supabase
            .from('business_services')
            .update({ is_active: service.is_active, updated_at: new Date().toISOString() })
            .eq('id', service.id);
        }
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [executeWithUndo, getQueryKeys]);

  return {
    deleteServiceWithUndo,
    toggleServiceStatusWithUndo,
    updateServicePriceWithUndo,
    bulkDeleteServicesWithUndo,
    bulkToggleServicesWithUndo,
  };
}
