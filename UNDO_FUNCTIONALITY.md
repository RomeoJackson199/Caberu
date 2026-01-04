# Gmail-Style Undo Functionality

This application now includes Gmail-style undo functionality for critical user actions. When you perform destructive actions (like deleting items or canceling appointments), you'll see a toast notification with an "Undo" button that gives you 5 seconds to reverse the action.

## Features

✨ **5-second undo window** - Gives users time to reverse accidental actions
🎯 **Optimistic UI updates** - Interface updates immediately for better UX
🔄 **Automatic rollback** - Reverts changes if server operations fail
📦 **Smart invalidation** - Refreshes relevant data after actions complete
🎨 **Toast notifications** - Clean, unobtrusive feedback using Sonner

## How It Works

1. User performs an action (e.g., cancel appointment)
2. UI updates immediately (optimistic update)
3. Toast appears with "Undo" button (5-second countdown)
4. If user clicks "Undo":
   - Action is cancelled
   - Original state is restored
   - Toast confirms the undo
5. If user doesn't click "Undo":
   - Action is committed to the server
   - Queries are invalidated and data refreshes

## Usage Examples

### 1. Appointment Actions with Undo

```tsx
import { useAppointmentActionsWithUndo } from '@/hooks/useAppointmentActionsWithUndo';

function AppointmentManager() {
  const {
    cancelAppointmentWithUndo,
    declineAppointmentWithUndo,
    markNoShowWithUndo
  } = useAppointmentActionsWithUndo({
    onOptimisticUpdate: (id, updates) => {
      // Update local state immediately
      setAppointments(prev =>
        prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
      );
    },
    onSuccess: (action, appointmentId) => {
      console.log(`${action} completed for ${appointmentId}`);
    },
  });

  const handleCancel = async (appointment) => {
    await cancelAppointmentWithUndo(appointment, () => {
      // Optional: close modal
      setModalOpen(false);
    });
  };

  return (
    <button onClick={() => handleCancel(appointment)}>
      Cancel Appointment
    </button>
  );
}
```

### 2. Inventory Actions with Undo

```tsx
import { useInventoryActionsWithUndo } from '@/hooks/useInventoryActionsWithUndo';

function InventoryManager() {
  const {
    deleteItemWithUndo,
    adjustQuantityWithUndo,
    bulkDeleteWithUndo
  } = useInventoryActionsWithUndo();

  const handleDelete = async (item) => {
    await deleteItemWithUndo(item);
    // Toast will show: "Dental Floss deleted" with Undo button
  };

  const handleQuantityChange = async (item, newQuantity) => {
    await adjustQuantityWithUndo(
      item.id,
      item.name,
      item.quantity,
      newQuantity,
      'correction'
    );
    // Toast will show: "Dental Floss quantity corrected: 50 → 75"
  };

  const handleBulkDelete = async (selectedItems) => {
    await bulkDeleteWithUndo(selectedItems);
    // Toast will show: "15 items deleted" with Undo button
  };

  return (
    <>
      <button onClick={() => handleDelete(item)}>Delete</button>
      <button onClick={() => handleQuantityChange(item, 100)}>
        Adjust Quantity
      </button>
      <button onClick={() => handleBulkDelete(selectedItems)}>
        Delete Selected
      </button>
    </>
  );
}
```

### 3. Custom Actions with useUndoManager

For any custom action, use the base `useUndoManager` hook:

```tsx
import { useUndoManager } from '@/hooks/useUndoManager';
import { supabase } from '@/integrations/supabase/client';

function PatientManager() {
  const { executeWithUndo } = useUndoManager();
  const [patients, setPatients] = useState([]);

  const deletePatientWithUndo = async (patient) => {
    // Save snapshot
    const snapshot = { ...patient };

    // Update UI optimistically
    setPatients(prev => prev.filter(p => p.id !== patient.id));

    await executeWithUndo({
      message: `${patient.name} removed`,
      description: 'Click undo to restore',
      undoDelay: 5000, // 5 seconds to undo
      action: async () => {
        // Actual deletion
        const { error } = await supabase
          .from('patients')
          .delete()
          .eq('id', patient.id);

        if (error) throw error;
      },
      undo: async () => {
        // Restore the patient
        setPatients(prev => [...prev, snapshot]);

        const { error } = await supabase
          .from('patients')
          .insert([snapshot]);

        if (error) throw error;
      },
      invalidateQueries: [['patients']],
      onSuccess: () => {
        console.log('Patient deleted successfully');
      },
      onError: (error) => {
        console.error('Failed to delete patient:', error);
      },
    });
  };

  return (
    <button onClick={() => deletePatientWithUndo(patient)}>
      Delete Patient
    </button>
  );
}
```

### 4. Optimistic Updates Without Undo

For actions that don't need undo but want optimistic updates:

```tsx
import { useUndoManager } from '@/hooks/useUndoManager';

function QuickActions() {
  const { executeOptimistic } = useUndoManager();

  const markAsPaid = async (invoiceId) => {
    // Update UI immediately
    updateInvoiceStatus(invoiceId, 'paid');

    await executeOptimistic({
      message: 'Marked as paid',
      action: async () => {
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', invoiceId);

        if (error) throw error;
      },
      rollback: () => {
        // Revert UI change if action fails
        updateInvoiceStatus(invoiceId, 'pending');
      },
      invalidateQueries: [['invoices']],
    });
  };
}
```

## API Reference

### `useUndoManager()`

Base hook for undo functionality.

#### `executeWithUndo(options)`

Execute an action with undo capability.

**Options:**
- `action: () => Promise<T>` - The action to execute after undo delay
- `undo: () => Promise<void>` - Function to restore previous state
- `message: string` - Success message for toast
- `description?: string` - Optional description
- `undoDelay?: number` - Delay before executing (default: 5000ms)
- `invalidateQueries?: string[][]` - Query keys to invalidate
- `onSuccess?: (result: T) => void` - Success callback
- `onUndo?: () => void` - Undo callback
- `onError?: (error: Error) => void` - Error callback

#### `executeOptimistic(options)`

Execute with optimistic update but no undo button.

**Options:**
- `action: () => Promise<T>` - The action to execute
- `rollback: () => void` - Function to revert optimistic update
- `message: string` - Success message
- `description?: string` - Optional description
- `invalidateQueries?: string[][]` - Query keys to invalidate
- `onSuccess?: (result: T) => void` - Success callback
- `onError?: (error: Error) => void` - Error callback

### `useAppointmentActionsWithUndo(options)`

Appointment-specific actions with undo.

**Options:**
- `businessId?: string` - Business ID for filtering
- `onSuccess?: (action, appointmentId) => void` - Success callback
- `onOptimisticUpdate?: (id, updates) => void` - Optimistic update handler

**Returns:**
- `cancelAppointmentWithUndo(appointment, closeModal?)` - Cancel with undo
- `declineAppointmentWithUndo(appointment, closeModal?)` - Decline with undo
- `markNoShowWithUndo(appointment, closeModal?)` - Mark no-show with undo

### `useInventoryActionsWithUndo()`

Inventory-specific actions with undo.

**Returns:**
- `deleteItemWithUndo(item)` - Delete item with undo
- `adjustQuantityWithUndo(itemId, name, oldQty, newQty, reason)` - Adjust quantity
- `bulkDeleteWithUndo(items)` - Bulk delete with undo

## Best Practices

1. **Use undo for destructive actions**: Deletions, cancellations, significant status changes
2. **Don't use undo for positive actions**: Confirmations, creations (unless they're high-risk)
3. **Keep undo delays short**: 5 seconds is the sweet spot (like Gmail)
4. **Provide clear messages**: Tell users exactly what happened and what undo does
5. **Handle errors gracefully**: Both action errors and undo errors
6. **Invalidate queries**: Always refresh data after actions complete

## Customization

### Custom Undo Delay

```tsx
await executeWithUndo({
  // ... other options
  undoDelay: 10000, // 10 seconds instead of 5
});
```

### Custom Toast Appearance

The toast styling is handled by Sonner and follows your theme settings automatically. The "Undo" button inherits the primary button styles from your theme.

### Multiple Actions

Users can perform multiple undoable actions. Each gets its own toast with independent undo buttons and timers.

## Technical Details

- **Toast Library**: Sonner (already integrated)
- **State Management**: TanStack React Query
- **Optimistic Updates**: Using React refs for snapshots
- **Error Handling**: Automatic rollback on failure
- **Query Invalidation**: Automatic refresh after completion

## Browser Support

Works in all modern browsers that support:
- ES6+ (async/await, Promises, Map)
- React 18+
- TanStack React Query v5+

## Migration Guide

If you're currently using `useOptimisticAppointmentActions`, you can gradually migrate:

```tsx
// Old way (no undo)
import { useOptimisticAppointmentActions } from '@/hooks/useOptimisticAppointmentActions';
const { cancelAppointment } = useOptimisticAppointmentActions();

// New way (with undo)
import { useAppointmentActionsWithUndo } from '@/hooks/useAppointmentActionsWithUndo';
const { cancelAppointmentWithUndo } = useAppointmentActionsWithUndo();
```

Both hooks can coexist. The new undo hooks are drop-in replacements with enhanced UX.
