/**
 * useInventoryActionsWithUndo Hook
 *
 * Inventory management actions with Gmail-style undo functionality.
 * Provides undo support for deletions and quantity adjustments.
 *
 * @example
 * const { deleteItemWithUndo, adjustQuantityWithUndo } = useInventoryActionsWithUndo();
 *
 * await deleteItemWithUndo(item);
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUndoManager } from './useUndoManager';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  business_id: string;
  [key: string]: any; // Other fields
}

interface QuantityAdjustment {
  itemId: string;
  oldQuantity: number;
  newQuantity: number;
}

export function useInventoryActionsWithUndo() {
  const queryClient = useQueryClient();
  const { executeWithUndo } = useUndoManager();
  const deletedItems = useRef<Map<string, InventoryItem>>(new Map());
  const adjustments = useRef<Map<string, QuantityAdjustment>>(new Map());

  /**
   * Get query keys to invalidate
   */
  const getQueryKeys = useCallback(() => [
    ['inventory'],
    ['inventory-items'],
    ['low-stock-items'],
    ['inventory-history'],
  ], []);

  /**
   * Delete an inventory item with undo support
   */
  const deleteItemWithUndo = useCallback(async (item: InventoryItem) => {
    // Save snapshot for undo
    deletedItems.current.set(item.id, { ...item });

    await executeWithUndo({
      message: `${item.name} deleted`,
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', item.id);

        if (error) throw error;

        deletedItems.current.delete(item.id);
        return item;
      },
      undo: async () => {
        const original = deletedItems.current.get(item.id);
        if (!original) return;

        // Restore the item
        const { error } = await supabase
          .from('inventory_items')
          .insert([original]);

        if (error) throw error;

        deletedItems.current.delete(item.id);
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [executeWithUndo, getQueryKeys]);

  /**
   * Adjust item quantity with undo support
   */
  const adjustQuantityWithUndo = useCallback(async (
    itemId: string,
    itemName: string,
    oldQuantity: number,
    newQuantity: number,
    reason: 'increase' | 'decrease' | 'usage' | 'correction'
  ) => {
    // Save snapshot for undo
    adjustments.current.set(itemId, { itemId, oldQuantity, newQuantity });

    const actionText = reason === 'increase' ? 'increased' :
                       reason === 'decrease' ? 'decreased' :
                       reason === 'usage' ? 'marked as used' : 'corrected';

    await executeWithUndo({
      message: `${itemName} quantity ${actionText}`,
      description: `${oldQuantity} → ${newQuantity}`,
      undoDelay: 5000,
      action: async () => {
        // Update quantity
        const { error } = await supabase
          .from('inventory_items')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (error) throw error;

        // Log the adjustment
        await supabase
          .from('inventory_history')
          .insert([{
            item_id: itemId,
            old_quantity: oldQuantity,
            new_quantity: newQuantity,
            reason: reason,
            created_at: new Date().toISOString(),
          }]);

        adjustments.current.delete(itemId);
      },
      undo: async () => {
        const adjustment = adjustments.current.get(itemId);
        if (!adjustment) return;

        // Restore original quantity
        const { error } = await supabase
          .from('inventory_items')
          .update({ quantity: oldQuantity, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (error) throw error;

        adjustments.current.delete(itemId);
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [executeWithUndo, getQueryKeys]);

  /**
   * Bulk delete items with undo support
   */
  const bulkDeleteWithUndo = useCallback(async (items: InventoryItem[]) => {
    // Save snapshots for undo
    items.forEach(item => {
      deletedItems.current.set(item.id, { ...item });
    });

    await executeWithUndo({
      message: `${items.length} items deleted`,
      description: 'Click undo to restore all',
      undoDelay: 5000,
      action: async () => {
        // Perform bulk deletion
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .in('id', items.map(i => i.id));

        if (error) throw error;

        items.forEach(item => deletedItems.current.delete(item.id));
      },
      undo: async () => {
        // Restore all items
        const itemsToRestore = items
          .map(item => deletedItems.current.get(item.id))
          .filter(Boolean) as InventoryItem[];

        if (itemsToRestore.length === 0) return;

        const { error } = await supabase
          .from('inventory_items')
          .insert(itemsToRestore);

        if (error) throw error;

        items.forEach(item => deletedItems.current.delete(item.id));
      },
      invalidateQueries: getQueryKeys(),
    });
  }, [executeWithUndo, getQueryKeys]);

  return {
    deleteItemWithUndo,
    adjustQuantityWithUndo,
    bulkDeleteWithUndo,
  };
}
