/**
 * useGenericCRUDWithUndo Hook
 *
 * Generic CRUD operations with Gmail-style undo functionality.
 * Can be used for any table/entity in the application.
 *
 * @example
 * const staffCrud = useGenericCRUDWithUndo({
 *   tableName: 'staff_members',
 *   entityName: 'staff member',
 *   queryKeys: [['staff'], ['team-members']],
 *   getDisplayName: (staff) => `${staff.first_name} ${staff.last_name}`,
 * });
 *
 * await staffCrud.deleteWithUndo(staffMember);
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUndoManager } from './useUndoManager';

interface GenericEntity {
  id: string;
  [key: string]: any;
}

interface UseGenericCRUDWithUndoOptions<T extends GenericEntity> {
  /** Supabase table name */
  tableName: string;
  /** Entity name for display (e.g., "staff member", "invoice") */
  entityName: string;
  /** Query keys to invalidate after operations */
  queryKeys: string[][];
  /** Function to get display name for entity */
  getDisplayName?: (entity: T) => string;
  /** Custom undo delay in milliseconds (default: 5000) */
  undoDelay?: number;
}

export function useGenericCRUDWithUndo<T extends GenericEntity>(
  options: UseGenericCRUDWithUndoOptions<T>
) {
  const {
    tableName,
    entityName,
    queryKeys,
    getDisplayName = (entity) => entity.name || entity.id,
    undoDelay = 5000,
  } = options;

  const queryClient = useQueryClient();
  const { executeWithUndo } = useUndoManager();
  const deletedEntities = useRef<Map<string, T>>(new Map());

  /**
   * Delete an entity with undo support
   */
  const deleteWithUndo = useCallback(async (entity: T) => {
    // Save snapshot for undo
    deletedEntities.current.set(entity.id, { ...entity } as T);

    const displayName = getDisplayName(entity);

    await executeWithUndo({
      message: `${entityName} deleted`,
      description: displayName,
      undoDelay,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', entity.id);

        if (error) throw error;

        deletedEntities.current.delete(entity.id);
        return entity;
      },
      undo: async () => {
        const original = deletedEntities.current.get(entity.id);
        if (!original) return;

        // Restore the entity
        const { error } = await supabase
          .from(tableName)
          .insert([original]);

        if (error) throw error;

        deletedEntities.current.delete(entity.id);
      },
      invalidateQueries: queryKeys,
    });
  }, [tableName, entityName, getDisplayName, undoDelay, executeWithUndo, queryKeys]);

  /**
   * Update an entity field with undo support
   */
  const updateFieldWithUndo = useCallback(async (
    entity: T,
    fieldName: string,
    newValue: any,
    displayMessage?: string
  ) => {
    const oldValue = entity[fieldName];

    await executeWithUndo({
      message: displayMessage || `${entityName} updated`,
      description: getDisplayName(entity),
      undoDelay,
      action: async () => {
        // Perform update
        const { error } = await supabase
          .from(tableName)
          .update({ [fieldName]: newValue, updated_at: new Date().toISOString() })
          .eq('id', entity.id);

        if (error) throw error;

        return entity;
      },
      undo: async () => {
        // Restore original value
        const { error } = await supabase
          .from(tableName)
          .update({ [fieldName]: oldValue, updated_at: new Date().toISOString() })
          .eq('id', entity.id);

        if (error) throw error;
      },
      invalidateQueries: queryKeys,
    });
  }, [tableName, entityName, getDisplayName, undoDelay, executeWithUndo, queryKeys]);

  /**
   * Update multiple fields with undo support
   */
  const updateFieldsWithUndo = useCallback(async (
    entity: T,
    updates: Partial<T>,
    displayMessage?: string
  ) => {
    // Save original values
    const originalValues: Partial<T> = {};
    Object.keys(updates).forEach(key => {
      originalValues[key as keyof T] = entity[key as keyof T];
    });

    await executeWithUndo({
      message: displayMessage || `${entityName} updated`,
      description: getDisplayName(entity),
      undoDelay,
      action: async () => {
        // Perform update
        const { error } = await supabase
          .from(tableName)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', entity.id);

        if (error) throw error;

        return entity;
      },
      undo: async () => {
        // Restore original values
        const { error } = await supabase
          .from(tableName)
          .update({ ...originalValues, updated_at: new Date().toISOString() })
          .eq('id', entity.id);

        if (error) throw error;
      },
      invalidateQueries: queryKeys,
    });
  }, [tableName, entityName, getDisplayName, undoDelay, executeWithUndo, queryKeys]);

  /**
   * Toggle a boolean field with undo support
   */
  const toggleFieldWithUndo = useCallback(async (
    entity: T,
    fieldName: string,
    displayMessage?: string
  ) => {
    const currentValue = entity[fieldName];
    const newValue = !currentValue;

    await updateFieldWithUndo(
      entity,
      fieldName,
      newValue,
      displayMessage || `${entityName} ${newValue ? 'enabled' : 'disabled'}`
    );
  }, [entityName, updateFieldWithUndo]);

  /**
   * Soft delete (archive) with undo support
   */
  const archiveWithUndo = useCallback(async (entity: T, archiveField = 'is_archived') => {
    const previousValue = entity[archiveField] || false;

    await executeWithUndo({
      message: `${entityName} archived`,
      description: getDisplayName(entity),
      undoDelay,
      action: async () => {
        // Mark as archived
        const { error } = await supabase
          .from(tableName)
          .update({ [archiveField]: true, updated_at: new Date().toISOString() })
          .eq('id', entity.id);

        if (error) throw error;

        return entity;
      },
      undo: async () => {
        // Restore archive status
        const { error } = await supabase
          .from(tableName)
          .update({ [archiveField]: previousValue, updated_at: new Date().toISOString() })
          .eq('id', entity.id);

        if (error) throw error;
      },
      invalidateQueries: queryKeys,
    });
  }, [tableName, entityName, getDisplayName, undoDelay, executeWithUndo, queryKeys]);

  /**
   * Bulk delete with undo support
   */
  const bulkDeleteWithUndo = useCallback(async (entities: T[]) => {
    // Save snapshots for undo
    entities.forEach(entity => {
      deletedEntities.current.set(entity.id, { ...entity } as T);
    });

    await executeWithUndo({
      message: `${entities.length} ${entityName}${entities.length > 1 ? 's' : ''} deleted`,
      description: 'Click undo to restore all',
      undoDelay,
      action: async () => {
        // Perform bulk deletion
        const { error } = await supabase
          .from(tableName)
          .delete()
          .in('id', entities.map(e => e.id));

        if (error) throw error;

        entities.forEach(entity => deletedEntities.current.delete(entity.id));
      },
      undo: async () => {
        // Restore all entities
        const entitiesToRestore = entities
          .map(entity => deletedEntities.current.get(entity.id))
          .filter(Boolean) as T[];

        if (entitiesToRestore.length === 0) return;

        const { error } = await supabase
          .from(tableName)
          .insert(entitiesToRestore);

        if (error) throw error;

        entities.forEach(entity => deletedEntities.current.delete(entity.id));
      },
      invalidateQueries: queryKeys,
    });
  }, [tableName, entityName, undoDelay, executeWithUndo, queryKeys]);

  /**
   * Bulk update a field with undo support
   */
  const bulkUpdateFieldWithUndo = useCallback(async (
    entities: T[],
    fieldName: string,
    newValue: any,
    displayMessage?: string
  ) => {
    await executeWithUndo({
      message: displayMessage || `${entities.length} ${entityName}${entities.length > 1 ? 's' : ''} updated`,
      description: 'Click undo to revert all',
      undoDelay,
      action: async () => {
        // Perform bulk update
        const { error } = await supabase
          .from(tableName)
          .update({ [fieldName]: newValue, updated_at: new Date().toISOString() })
          .in('id', entities.map(e => e.id));

        if (error) throw error;
      },
      undo: async () => {
        // Restore each entity to its original value
        for (const entity of entities) {
          await supabase
            .from(tableName)
            .update({ [fieldName]: entity[fieldName], updated_at: new Date().toISOString() })
            .eq('id', entity.id);
        }
      },
      invalidateQueries: queryKeys,
    });
  }, [tableName, entityName, undoDelay, executeWithUndo, queryKeys]);

  return {
    deleteWithUndo,
    updateFieldWithUndo,
    updateFieldsWithUndo,
    toggleFieldWithUndo,
    archiveWithUndo,
    bulkDeleteWithUndo,
    bulkUpdateFieldWithUndo,
  };
}
